# Simple Store Backend with Firebase & JWT

This is a complete backend solution for a store with real-time price updates, restricted to a specific admin email.

## 🚀 Features
- **Admin Authentication**: Secure login via Firebase Auth & JWT.
- **Role-Based Access**: Only the specified `ADMIN_EMAIL` can update prices.
- **Real-time Database**: Uses Firestore for instant updates on the frontend.
- **Secure**: Environment variables for sensitive keys.

---

## 🛠️ Setup Instructions

### 1. Prerequisites
- Node.js installed.
- A Firebase Project created at [console.firebase.google.com](https://console.firebase.google.com/).

### 2. Installation
```bash
cd store-backend
npm install
```

### 3. Firebase Configuration
1. Go to **Project Settings** > **Service Accounts** > **Generate New Private Key**.
   - Open the JSON file and copy the `private_key` (including `-----BEGIN...`), `client_email`, and `project_id`.
2. Go to **Authentication** > **Sign-in method** and enable **Email/Password**.
3. Create an admin user in Firebase Auth with the email you want to use (e.g. `admin@gmail.com`).
4. Go to **Project Settings** > **General** and copy the **Web API Key**.

### 4. Environment Variables
Rename `.env.example` to `.env` and fill in the details:
```env
PORT=5000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_API_KEY=your-web-api-key
JWT_SECRET=mysupersecretkey
ADMIN_EMAIL=admin@gmail.com
```

### 5. Run the Server
```bash
npm start
```
Server will start on `http://localhost:5000`.

---

## 🔗 Frontend Integration Guide

### 1. Authenticate & Get Token (Login Page)
```javascript
async function login(email, password) {
  const response = await fetch('http://localhost:5000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('token', data.token); // Save JWT
    console.log('Logged in!');
  }
}
```

### 2. Update Price (Admin Dashboard)
```javascript
async function updatePrice(productId, newPrice) {
  const token = localStorage.getItem('token');
  
  await fetch(`http://localhost:5000/product/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ price: newPrice })
  });
}
```

### 3. Real-time Updates (Client/Store Page)
Use Firebase Client SDK directly for real-time updates.

```javascript
// Initialize Firebase Client SDK
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

const firebaseConfig = { /* Your Config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Listen for changes
onSnapshot(doc(db, "products", "item1"), (doc) => {
  const data = doc.data();
  console.log("New Price:", data.price);
  document.getElementById("price-display").innerText = `$${data.price}`;
});
```
