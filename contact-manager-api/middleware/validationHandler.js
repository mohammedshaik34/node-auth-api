
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');

const validateToken = asyncHandler(async (req, res, next) => {
    let authToken = null;
    let authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        authToken = authHeader.split(' ')[1];
        jwt.verify(authToken, process.env.JWT_SECRET, (err, decoded) => {   
            if (err) {
                res.status(401);
                throw new Error('User is not authorized');
            }
            console.log('Decoded Token:', decoded);
            req.user = decoded.user;
            next();
        });
}
    if (!authToken) {
        res.status(401);
        throw new Error('User is not authorized or token is missing');
    }
})
module.exports =  validateToken ;
