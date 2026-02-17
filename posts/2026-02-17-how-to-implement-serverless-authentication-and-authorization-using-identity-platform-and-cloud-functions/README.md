# How to Implement Serverless Authentication and Authorization Using Identity Platform and Cloud Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Identity Platform, Cloud Functions, Authentication, Authorization, Serverless Security

Description: Implement a complete serverless authentication and authorization system on Google Cloud using Identity Platform for user management and Cloud Functions for access control.

---

Building authentication from scratch is one of those things that sounds simple but is actually full of security pitfalls. Token management, password hashing, session handling, multi-factor authentication, social login - each of these has subtle ways to go wrong. Google Cloud Identity Platform gives you a production-ready authentication system that handles all of this, and when combined with Cloud Functions, you can build a complete auth layer without managing any servers.

In this post, I will walk through setting up Identity Platform, implementing sign-up and sign-in flows, adding role-based authorization, and securing Cloud Functions endpoints with token verification.

## Setting Up Identity Platform

Enable Identity Platform and configure the sign-in providers you want to support.

```bash
# Enable the Identity Platform API
gcloud services enable identitytoolkit.googleapis.com

# Enable email/password authentication
gcloud identity-platform config update \
  --enable-email-signin

# You can also enable social providers through the console:
# Google, Facebook, Apple, GitHub, Twitter, etc.
```

## Client-Side Authentication

On the client side, use the Firebase Auth SDK (Identity Platform is compatible with Firebase Auth). Here is a complete authentication module.

```javascript
// auth-client.js - Client-side authentication
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';

// Initialize with your GCP project config
const app = initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT',
});

const auth = getAuth(app);

// Sign up a new user with email and password
export async function signUp(email, password, displayName) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Send email verification
    await sendEmailVerification(user);

    // Get the ID token to send to your backend
    const token = await user.getIdToken();

    // Call your Cloud Function to set up the user profile
    await fetch('https://REGION-PROJECT.cloudfunctions.net/onUserCreated', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ displayName }),
    });

    return { user, token };
  } catch (error) {
    console.error('Sign up failed:', error.code, error.message);
    throw error;
  }
}

// Sign in with email and password
export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdToken();
  return { user: credential.user, token };
}

// Sign in with Google
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');

  const credential = await signInWithPopup(auth, provider);
  const token = await credential.user.getIdToken();
  return { user: credential.user, token };
}

// Listen for auth state changes
export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

// Sign out
export async function logOut() {
  await signOut(auth);
}

// Get the current user's ID token for API calls
export async function getToken() {
  const user = auth.currentUser;
  if (!user) return null;
  // Force refresh ensures the token is not expired
  return user.getIdToken(true);
}
```

## Server-Side Token Verification

On the server side, verify ID tokens in your Cloud Functions using the Firebase Admin SDK.

```javascript
// verify-token.js - Server-side token verification middleware
const admin = require('firebase-admin');

// Initialize the Admin SDK - on GCP it auto-discovers credentials
admin.initializeApp();

async function verifyToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Verify the ID token and get the decoded claims
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

// Middleware wrapper for Cloud Functions
function requireAuth(handler) {
  return async (req, res) => {
    try {
      const user = await verifyToken(req);
      req.user = user;
      return handler(req, res);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  };
}

module.exports = { verifyToken, requireAuth };
```

## Implementing Role-Based Access Control

Use custom claims to assign roles to users. Custom claims are included in the ID token and can be verified without additional database lookups.

```javascript
// set-user-role.js - Admin function to assign roles
const admin = require('firebase-admin');
admin.initializeApp();

exports.setUserRole = async (req, res) => {
  // Only allow admins to set roles
  const caller = await admin.auth().verifyIdToken(
    req.headers.authorization.split('Bearer ')[1]
  );

  if (caller.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can assign roles' });
  }

  const { userId, role } = req.body;
  const validRoles = ['admin', 'editor', 'viewer'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  // Set the custom claim on the user
  await admin.auth().setCustomUserClaims(userId, { role });

  // The user will need to refresh their token to get the new claims
  // You can also revoke existing tokens to force a refresh
  await admin.auth().revokeRefreshTokens(userId);

  res.json({ message: `Role ${role} assigned to user ${userId}` });
};
```

## Building Authorization Middleware

Create reusable middleware that checks both authentication and authorization.

```javascript
// auth-middleware.js
const admin = require('firebase-admin');

// Check if the user has a specific role
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = await admin.auth().verifyIdToken(token);
      const userRole = decoded.role || 'viewer';

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole,
        });
      }

      req.user = decoded;
      if (next) next();
      return decoded;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Check if the user owns the resource they are trying to access
function requireOwnership(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      const decoded = await admin.auth().verifyIdToken(token);

      // Admins can access anything
      if (decoded.role === 'admin') {
        req.user = decoded;
        if (next) next();
        return;
      }

      const ownerId = await getResourceOwnerId(req);
      if (decoded.uid !== ownerId) {
        return res.status(403).json({ error: 'You can only access your own resources' });
      }

      req.user = decoded;
      if (next) next();
    } catch (error) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

module.exports = { requireRole, requireOwnership };
```

## Secured Cloud Functions

Put it all together with Cloud Functions that use the authentication and authorization middleware.

```javascript
// secure-api/index.js
const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');
const { requireRole, requireOwnership } = require('./auth-middleware');

admin.initializeApp();
const db = new Firestore();

// Public endpoint - no auth required
functions.http('getPublicData', async (req, res) => {
  const docs = await db.collection('public_posts').limit(10).get();
  const posts = docs.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json(posts);
});

// Authenticated endpoint - any logged-in user
functions.http('getUserProfile', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Login required' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const profile = await db.collection('profiles').doc(decoded.uid).get();

    if (!profile.exists) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ uid: decoded.uid, ...profile.data() });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Admin-only endpoint
functions.http('listAllUsers', async (req, res) => {
  const authCheck = requireRole('admin');
  const result = await authCheck(req, res);
  if (!result) return;  // Response already sent with error

  const listResult = await admin.auth().listUsers(100);
  const users = listResult.users.map(user => ({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.customClaims?.role || 'viewer',
  }));

  res.json(users);
});
```

## Handling User Lifecycle Events

Use blocking functions to intercept authentication events and add custom logic.

```javascript
// auth-triggers.js - React to authentication events
const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');

admin.initializeApp();
const db = new Firestore();

// Triggered when a new user signs up via Identity Platform
exports.onUserCreated = async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  const decoded = await admin.auth().verifyIdToken(token);
  const { displayName } = req.body;

  // Create a user profile document
  await db.collection('profiles').doc(decoded.uid).set({
    email: decoded.email,
    displayName: displayName || decoded.name || '',
    photoURL: decoded.picture || '',
    createdAt: Firestore.Timestamp.now(),
    plan: 'free',
  });

  // Assign default role
  await admin.auth().setCustomUserClaims(decoded.uid, {
    role: 'viewer',
  });

  res.json({ success: true });
};
```

## Deploying the Functions

```bash
# Deploy the public endpoint
gcloud functions deploy getPublicData \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated

# Deploy authenticated endpoints
gcloud functions deploy getUserProfile \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated

# Deploy admin endpoint
gcloud functions deploy listAllUsers \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated

# Deploy user lifecycle handler
gcloud functions deploy onUserCreated \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated
```

## Wrapping Up

Identity Platform handles the hard parts of authentication - secure password storage, token management, social logins, MFA. Cloud Functions let you add custom authorization logic without any servers. Custom claims give you a clean way to implement RBAC without extra database lookups on every request. The result is a secure, scalable authentication system that costs you nothing when nobody is using it.

Monitor your auth endpoints with OneUptime to track sign-in success rates, token verification failures, and authorization denials. Spikes in failed authentication attempts could indicate a brute force attack, and monitoring these patterns helps you respond quickly to security incidents.
