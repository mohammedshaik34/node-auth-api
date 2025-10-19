require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();
const pool = require('./db');
const authMiddleware = require('./auth-middleware');
const authRoutes = require('./auth');

// Middleware
app.use(express.json());

// Security headers
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Validation helper
const validateInput = (fields) => {
    const errors = [];
    for (const [key, value] of Object.entries(fields)) {
        if (!value || value.trim() === '') {
            errors.push(`${key} is required`);
        }
    }
    return errors;
};

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected'
        });
    } catch (err) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: err.message
        });
    }
});

// Get all users (paginated)
app.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        const result = await pool.query(
            'SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        
        const countResult = await pool.query('SELECT COUNT(*) FROM users');
        const totalUsers = parseInt(countResult.rows[0].count);
        
        res.json({
            users: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalUsers,
                totalPages: Math.ceil(totalUsers / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Search users
app.get('/users/search', async (req, res) => {
    try {
        const { name, city } = req.query;
        
        if (!name && !city) {
            return res.status(400).json({ 
                error: 'Provide at least one search parameter (name or city)' 
            });
        }
        
        let query = 'SELECT * FROM users WHERE 1=1';
        const params = [];
        let paramCount = 1;
        
        if (name) {
            query += ` AND name ILIKE $${paramCount}`;
            params.push(`%${name}%`);
            paramCount++;
        }
        
        if (city) {
            query += ` AND city ILIKE $${paramCount}`;
            params.push(`%${city}%`);
            paramCount++;
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        
        res.json({
            count: result.rows.length,
            users: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get single user by ID
app.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create user (protected)
app.post('/users', authMiddleware, async (req, res) => {
    try {
        const { name, city } = req.body;
        
        // Validate inputs
        const errors = validateInput({ name, city });
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        
        // Name length validation
        if (name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({ 
                error: 'Name must be between 2 and 100 characters' 
            });
        }
        
        const result = await pool.query(
            'INSERT INTO users (name, city) VALUES ($1, $2) RETURNING *',
            [name.trim(), city.trim()]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update user (protected)
app.put('/users/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, city } = req.body;
        
        // Validate inputs
        const errors = validateInput({ name, city });
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        
        const result = await pool.query(
            'UPDATE users SET name = $1, city = $2 WHERE id = $3 RETURNING *',
            [name.trim(), city.trim(), id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete user (protected)
app.delete('/users/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            message: 'User deleted successfully',
            user: result.rows[0] 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Analytics: Users by city
app.get('/analytics/users-by-city', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                city,
                COUNT(*) as user_count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) as percentage
            FROM users
            GROUP BY city
            ORDER BY user_count DESC
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Analytics: Recent users
app.get('/analytics/recent-users', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        const result = await pool.query(`
            SELECT 
                id,
                name,
                city,
                created_at,
                AGE(NOW(), created_at) as account_age
            FROM users
            WHERE created_at >= NOW() - $1::INTERVAL
            ORDER BY created_at DESC
        `, [`${days} days`]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Analytics: Dashboard
app.get('/analytics/dashboard', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(DISTINCT city) as unique_cities,
                MAX(created_at) as newest_user,
                MIN(created_at) as oldest_user
            FROM users
        `);
        
        const cityStats = await pool.query(`
            SELECT 
                city,
                COUNT(*) as user_count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) as percentage
            FROM users
            GROUP BY city
            ORDER BY user_count DESC
            LIMIT 5
        `);
        
        res.json({
            overview: stats.rows[0],
            topCities: cityStats.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.path 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Database: Connected');
    console.log('Security: Helmet, CORS, Rate Limiting enabled');
});