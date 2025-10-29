console.log("I am in express server.js file ");
const express = require('express');
const { errorHandler } = require('./middleware/errorHandler');
const app = express();
const dotenv = require('dotenv').config();
const PORT = process.env.PORT;
const connectDB = require('./config/dbConnection');
connectDB();
app.use(express.json());
app.use('/api/contacts', require('./routes/contactRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use(errorHandler)
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

