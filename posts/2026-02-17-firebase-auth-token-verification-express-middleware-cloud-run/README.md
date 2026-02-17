# How to Implement Firebase Auth Token Verification in an Express.js Middleware on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firebase Auth, Express, Cloud Run, Node.js, Authentication, Google Cloud

Description: Implement Firebase Auth token verification as Express.js middleware on Cloud Run to secure your API endpoints with JWT-based authentication.

---

Firebase Authentication provides a complete identity solution that supports email/password, social login, phone authentication, and more. When building backend APIs with Express.js on Cloud Run, you need a way to verify that incoming requests come from authenticated users. Firebase Auth uses JWT tokens (ID tokens) that your backend can verify without making any network calls to Firebase on every request.

In this guide, I will show you how to build an Express middleware that verifies Firebase Auth tokens, extracts user information, and protects your API routes.

## How Firebase Auth Tokens Work

When a user signs in through Firebase Auth (from a web or mobile app), they receive an ID token - a signed JWT that contains claims about the user. Your backend verifies this token using the Firebase Admin SDK, which checks the token's signature against Google's public keys. These keys are cached locally, so verification is fast and does not require a network call on every request.

The ID token contains claims like the user's UID, email, display name, and any custom claims you have set.

## Setting Up

```bash
# Install the Firebase Admin SDK
npm install express firebase-admin
```

## Initializing Firebase Admin

```javascript
// firebase.js - Initialize Firebase Admin SDK
const admin = require('firebase-admin');

// On Cloud Run, this uses Application Default Credentials automatically
// No service account key file needed
admin.initializeApp({
  projectId: process.env.PROJECT_ID || 'your-project-id',
});

module.exports = admin;
```

When running on Cloud Run, the Admin SDK picks up credentials from the environment. For local development, either set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable or download a service account key.

## Building the Authentication Middleware

```javascript
// middleware/auth.js - Firebase Auth verification middleware
const admin = require('../firebase');

// Main authentication middleware
async function authenticateToken(req, res, next) {
  // Extract the token from the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Missing authorization header',
      code: 'AUTH_MISSING',
    });
  }

  // Expect format: "Bearer <token>"
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Invalid authorization format. Use: Bearer <token>',
      code: 'AUTH_INVALID_FORMAT',
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Verify the ID token with Firebase Admin
    // This checks the signature, expiration, audience, and issuer
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Attach the decoded token to the request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      // Include any custom claims
      role: decodedToken.role || 'user',
      customClaims: decodedToken,
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error.code);

    // Handle specific error types
    switch (error.code) {
      case 'auth/id-token-expired':
        return res.status(401).json({
          error: 'Token expired. Please sign in again.',
          code: 'AUTH_EXPIRED',
        });

      case 'auth/id-token-revoked':
        return res.status(401).json({
          error: 'Token has been revoked. Please sign in again.',
          code: 'AUTH_REVOKED',
        });

      case 'auth/argument-error':
        return res.status(401).json({
          error: 'Invalid token format',
          code: 'AUTH_INVALID',
        });

      default:
        return res.status(401).json({
          error: 'Authentication failed',
          code: 'AUTH_FAILED',
        });
    }
  }
}

module.exports = { authenticateToken };
```

## Optional Authentication Middleware

Sometimes you want an endpoint to work for both authenticated and anonymous users, with different behavior for each.

```javascript
// middleware/auth.js - Optional authentication
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // No token provided - continue as anonymous
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      role: decodedToken.role || 'user',
    };
  } catch (error) {
    // Token is invalid but we do not block the request
    req.user = null;
    console.warn('Invalid token in optional auth:', error.code);
  }

  next();
}

module.exports = { authenticateToken, optionalAuth };
```

## Role-Based Authorization Middleware

Beyond authentication, you often need authorization - checking whether the authenticated user has permission to perform an action.

```javascript
// middleware/authorize.js - Role-based authorization
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // This middleware must come after authenticateToken
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        requiredRole: allowedRoles,
        currentRole: req.user.role,
      });
    }

    next();
  };
}

// Check if user owns the resource or is an admin
function requireOwnerOrRole(getResourceOwnerId, ...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Admins can access anything
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // Check resource ownership
    try {
      const ownerId = await getResourceOwnerId(req);
      if (ownerId === req.user.uid) {
        return next();
      }
    } catch (error) {
      console.error('Owner check failed:', error);
    }

    res.status(403).json({ error: 'Forbidden' });
  };
}

module.exports = { requireRole, requireOwnerOrRole };
```

## Setting Custom Claims

Custom claims let you add role information to the JWT so your middleware can check roles without a database query.

```javascript
// admin-routes.js - Admin endpoints for managing custom claims
const admin = require('../firebase');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');

const router = require('express').Router();

// Set a user's role (admin only)
router.post(
  '/users/:uid/role',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    const { uid } = req.params;
    const { role } = req.body;

    const validRoles = ['user', 'editor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    try {
      // Set custom claims on the user
      await admin.auth().setCustomUserClaims(uid, { role });

      // The user will get the new claims next time their token refreshes
      // Force token refresh by revoking current tokens
      await admin.auth().revokeRefreshTokens(uid);

      res.json({ message: `Role set to ${role} for user ${uid}` });
    } catch (error) {
      console.error('Failed to set claims:', error);
      res.status(500).json({ error: 'Failed to set role' });
    }
  }
);

module.exports = router;
```

## Putting It All Together

```javascript
// app.js - Express application with Firebase Auth
const express = require('express');
const { authenticateToken, optionalAuth } = require('./middleware/auth');
const { requireRole } = require('./middleware/authorize');

const app = express();
app.use(express.json());

// Public endpoint - no authentication required
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Optional auth - works for both anonymous and authenticated users
app.get('/api/products', optionalAuth, (req, res) => {
  const products = getProducts();

  if (req.user) {
    // Authenticated users see personalized pricing
    res.json(products.map((p) => ({
      ...p,
      price: getUserPrice(p, req.user.uid),
    })));
  } else {
    // Anonymous users see default pricing
    res.json(products);
  }
});

// Protected endpoint - requires authentication
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
  });
});

// Protected with role check - requires admin role
app.get(
  '/api/admin/users',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    // List all users (admin only)
    const listResult = await admin.auth().listUsers(100);
    res.json(
      listResult.users.map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        customClaims: user.customClaims,
      }))
    );
  }
);

// Protected resource with ownership check
app.put(
  '/api/posts/:id',
  authenticateToken,
  async (req, res) => {
    const post = await getPost(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Only the author or an admin can update
    if (post.authorUid !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await updatePost(req.params.id, req.body);
    res.json(updated);
  }
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Token Caching Considerations

The Firebase Admin SDK already caches the Google public keys used to verify tokens. However, the `verifyIdToken` call still decodes and validates the JWT on every request. For high-throughput APIs, you can add a short-lived cache.

```javascript
// Simple in-memory token cache with short TTL
const tokenCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

async function verifyTokenWithCache(idToken) {
  // Use a hash of the token as the cache key
  const cacheKey = idToken.substring(idToken.length - 20);

  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.decoded;
  }

  const decoded = await admin.auth().verifyIdToken(idToken);

  tokenCache.set(cacheKey, {
    decoded,
    timestamp: Date.now(),
  });

  return decoded;
}
```

Firebase Auth token verification on Express.js is one of the most straightforward ways to secure your Cloud Run APIs. The Firebase Admin SDK handles all the cryptographic verification, and with a few lines of middleware you get a complete authentication and authorization system. Combined with custom claims for role-based access, you can build sophisticated permission models without managing your own user database.
