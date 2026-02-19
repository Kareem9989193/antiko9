const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { verifyToken, verifyAdmin } = require('./middleware/authMiddleware');

// Load environment variables if .env exists (Cloud Functions v2 supports this automatically if in functions root)
require('dotenv').config();

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok', environment: 'firebase-functions' }));

// 1. General Registration Route
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Data required' });

    try {
        const apiKey = process.env.FIREBASE_API_KEY;
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
        const response = await axios.post(url, { email, password, returnSecureToken: true });
        res.json({ message: 'User registered successfully', uid: response.data.localId });
    } catch (error) {
        res.status(401).json({ error: error.response?.data?.error?.message || 'Registration failed' });
    }
});

// 2. Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
        const apiKey = process.env.FIREBASE_API_KEY;
        const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
        const response = await axios.post(authUrl, { email, password, returnSecureToken: true });

        const { localId, email: userEmail } = response.data;
        const adminEmails = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().split(',').map(e => e.trim()) : [];
        const role = adminEmails.includes(userEmail.toLowerCase().trim()) ? 'admin' : 'user';

        const token = jwt.sign(
            { uid: localId, email: userEmail, role: role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, role, message: 'Login successful' });
    } catch (error) {
        res.status(410).json({ error: 'Invalid credentials' });
    }
});

// 3. Google Login Route
app.post('/login-google', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'ID Token required' });

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email: userEmail } = decodedToken;
        const adminEmails = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().split(',').map(e => e.trim()) : [];
        const role = adminEmails.includes(userEmail.toLowerCase().trim()) ? 'admin' : 'user';

        const token = jwt.sign(
            { uid: uid, email: userEmail, role: role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, role, message: 'Google Login successful' });
    } catch (error) {
        res.status(401).json({ error: 'Auth failed: ' + error.message });
    }
});

// Generic CRUD - List
app.get('/:collection', async (req, res) => {
    const { collection } = req.params;
    try {
        const snapshot = await db.collection(collection).orderBy('createdAt', 'asc').get();
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// Generic CRUD - Create (Protected)
app.post('/:collection', verifyToken, verifyAdmin, async (req, res) => {
    const { collection } = req.params;
    const data = req.body;
    try {
        const docRef = await db.collection(collection).add({
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ message: 'Added successfully', id: docRef.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// Generic CRUD - Update
app.put('/:collection/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { collection, id } = req.params;
    const data = req.body;
    try {
        await db.collection(collection).doc(id).set({
            ...data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        res.json({ message: 'Updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
});

// Generic CRUD - Delete
app.delete('/:collection/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { collection, id } = req.params;
    try {
        await db.collection(collection).doc(id).delete();
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// Export the app as a Cloud Function
exports.api = onRequest({
    region: 'us-central1', // Change if needed
    cors: true,
    maxInstances: 10
}, app);
