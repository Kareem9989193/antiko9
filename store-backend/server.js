require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
const { verifyToken, verifyAdmin } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase Admin SDK
// You typically verify the private key format carefully
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1')
        : undefined,
};

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin Initialized');
    } catch (error) {
        console.error('Firebase Admin Init Error:', error.message);
    }
}

const db = admin.firestore();

// Middleware
app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));

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

// 3. Google Login Route
app.post('/login-google', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'ID Token required' });

    try {
        // Verify the ID token from Google/Firebase
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email: userEmail } = decodedToken;
        const adminEmails = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().split(',').map(e => e.trim()) : [];

        // Determine role (Case-insensitive check against list)
        const normalizedUserEmail = userEmail.toLowerCase().trim();
        const role = adminEmails.includes(normalizedUserEmail) ? 'admin' : 'user';

        console.log(`Google Login: ${normalizedUserEmail} | Role assigned: ${role}`);

        // Issue site JWT
        const token = jwt.sign(
            { uid: uid, email: userEmail, role: role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, role, message: 'Google Login successful' });

    } catch (error) {
        console.error('Google Auth Error:', error.message);
        res.status(401).json({ error: 'Auth failed: ' + error.message });
    }
});
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        const apiKey = process.env.FIREBASE_API_KEY;
        const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

        const response = await axios.post(authUrl, {
            email,
            password,
            returnSecureToken: true,
        });

        const { localId, email: userEmail } = response.data;
        const adminEmails = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().split(',').map(e => e.trim()) : [];

        // Determine role (Case-insensitive check against list)
        const normalizedUserEmail = userEmail.toLowerCase().trim();
        const role = adminEmails.includes(normalizedUserEmail) ? 'admin' : 'user';

        console.log(`Login attempt: ${normalizedUserEmail} | Role assigned: ${role}`);

        // Issue JWT
        const token = jwt.sign(
            { uid: localId, email: userEmail, role: role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, role, message: 'Login successful' });

    } catch (error) {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// 2. Get Product (Public)
app.get('/product/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const doc = await db.collection('products').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(doc.data());
    } catch (error) {
        console.error('Get Product Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. Update Product Price (Protected: JWT + Admin Email Check)
app.put('/product/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { price } = req.body;

    if (price === undefined) {
        return res.status(400).json({ error: 'Price is required' });
    }

    try {
        const productRef = db.collection('products').doc(id);
        await productRef.set({
            price: Number(price),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        res.json({ message: 'Price updated successfully', productId: id, newPrice: price });
    } catch (error) {
        console.error('Update Product Error:', error);
        res.status(500).json({ error: 'Failed to update price' });
    }
});

// 5. Generic CRUD - Create (Protected)
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
        console.error(`Add Item Error [${collection}]:`, error);
        res.status(500).json({ error: `Failed to add item: ${error.message}` });
    }
});

// 6. Generic CRUD - List (Public)
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

// 7. Generic CRUD - Delete (Protected)
app.delete('/:collection/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { collection, id } = req.params;
    try {
        await db.collection(collection).doc(id).delete();
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error(`Delete Error [${collection}/${id}]:`, error);
        res.status(500).json({ error: `Failed to delete: ${error.message}` });
    }
});

// 8. Generic Update (Protected)
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
        console.error(`Update Error [${collection}/${id}]:`, error);
        res.status(500).json({ error: `Failed to update: ${error.message}` });
    }
});

const fs = require('fs');
// 9. List Files (Protected)
app.get('/admin/files', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const folderPath = path.join(__dirname, '../annn');
        const files = fs.readdirSync(folderPath);
        const result = files.map(file => {
            const stats = fs.statSync(path.join(folderPath, file));
            return {
                name: file,
                isDir: stats.isDirectory(),
                size: stats.size < 1024 ? stats.size + ' B' : (stats.size / 1024).toFixed(1) + ' KB'
            };
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list files' });
    }
});

const path = require('path');

// 10. Get File Content (Protected)
app.get('/admin/file-content', verifyToken, verifyAdmin, async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'File name required' });
    try {
        const filePath = path.join(__dirname, '../annn', name);
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            return res.status(404).json({ error: 'File not found' });
        }
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ content });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read file' });
    }
});

// 11. Save File Content (Protected)
app.post('/admin/save-file', verifyToken, verifyAdmin, async (req, res) => {
    const { name, content } = req.body;
    if (!name || content === undefined) return res.status(400).json({ error: 'Name and content required' });
    try {
        const filePath = path.join(__dirname, '../annn', name);
        // Security check: ensure file is within /annn and not trying to escape
        const normalizedPath = path.normalize(filePath);
        const frontendPath = path.normalize(path.join(__dirname, '../annn'));
        if (!normalizedPath.startsWith(frontendPath)) {
            return res.status(403).json({ error: 'Path traversal denied' });
        }

        fs.writeFileSync(filePath, content, 'utf8');
        res.json({ message: 'File saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save file' });
    }
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
    const HOST = '0.0.0.0';
    app.listen(PORT, HOST, () => {
        console.log(`Server running on http://${HOST}:${PORT}`);
    });
}

module.exports = app;
