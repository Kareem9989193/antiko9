const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Expect "Bearer TOKEN"

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Middleware to check if the user is an Admin
const verifyAdmin = (req, res, next) => {
    const adminEmails = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().split(',').map(e => e.trim()) : [];

    if (!adminEmails.includes(req.user.email.toLowerCase().trim())) {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }

    next();
};

module.exports = { verifyToken, verifyAdmin };
