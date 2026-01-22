# How to Create Authentication with JWT in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, JWT, Authentication, Security, Express

Description: Learn how to implement JWT (JSON Web Token) authentication in Node.js Express applications, including token generation, validation, refresh tokens, and best practices.

---

JWT (JSON Web Token) is a popular method for implementing stateless authentication in web applications. This guide covers implementing secure JWT authentication in Node.js with Express.

## Installation

```bash
npm install jsonwebtoken bcrypt express
```

## Basic JWT Implementation

### Token Generation

```javascript
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

// Generate token
function generateToken(payload, expiresIn = '1h') {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

// Verify token
function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}

// Usage
const token = generateToken({ userId: 123, email: 'user@example.com' });
console.log('Token:', token);

const decoded = verifyToken(token);
console.log('Decoded:', decoded);
```

### Complete Auth System

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

// Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '15m';
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const REFRESH_EXPIRES_IN = '7d';

// Mock user database
const users = [];
const refreshTokens = new Set();

// Register endpoint
app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // Check if user exists
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // Create user
  const user = {
    id: users.length + 1,
    email,
    name,
    password: hashedPassword,
    createdAt: new Date(),
  };
  users.push(user);
  
  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);
  
  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  });
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Verify password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);
  
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  });
});

// Refresh token endpoint
app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  
  if (!refreshTokens.has(refreshToken)) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (error) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  const { refreshToken } = req.body;
  refreshTokens.delete(refreshToken);
  res.json({ message: 'Logged out successfully' });
});

// Helper functions
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

app.listen(3000);
```

## Authentication Middleware

### Basic Middleware

```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];  // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Usage
app.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
```

### Optional Authentication

```javascript
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      // Token invalid but continue
    }
  }
  
  next();
}

// Usage - works with or without authentication
app.get('/posts', optionalAuth, (req, res) => {
  const posts = getPosts();
  
  if (req.user) {
    // Show user-specific data
    posts.forEach(p => p.canEdit = p.authorId === req.user.userId);
  }
  
  res.json(posts);
});
```

### Role-Based Authorization

```javascript
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// Usage
app.delete('/users/:id', 
  authenticateToken, 
  authorize('admin'),
  (req, res) => {
    // Only admins can delete users
    res.json({ message: 'User deleted' });
  }
);

app.get('/dashboard', 
  authenticateToken, 
  authorize('admin', 'manager'),
  (req, res) => {
    // Admins and managers can access
    res.json({ data: getDashboardData() });
  }
);
```

## Token Storage Best Practices

### HTTP-Only Cookies

```javascript
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Set token in HTTP-only cookie
app.post('/auth/login', async (req, res) => {
  // ... validate credentials
  
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  // Set cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,  // 15 minutes
  });
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth/refresh',  // Only sent to refresh endpoint
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  });
  
  res.json({ user });
});

// Middleware to read from cookie
function authenticateFromCookie(req, res, next) {
  const token = req.cookies.accessToken;
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Refresh Token Rotation

```javascript
const crypto = require('crypto');

// Store refresh tokens with metadata
const refreshTokenStore = new Map();

function generateRefreshToken(user) {
  const token = crypto.randomBytes(40).toString('hex');
  
  refreshTokenStore.set(token, {
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  
  return token;
}

app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  const tokenData = refreshTokenStore.get(refreshToken);
  
  if (!tokenData || tokenData.expiresAt < Date.now()) {
    refreshTokenStore.delete(refreshToken);
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
  
  // Delete old token
  refreshTokenStore.delete(refreshToken);
  
  // Get user
  const user = users.find(u => u.id === tokenData.userId);
  if (!user) {
    return res.status(403).json({ error: 'User not found' });
  }
  
  // Generate new tokens (rotation)
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  
  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});
```

## Token Blacklisting

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Blacklist a token (on logout or security event)
async function blacklistToken(token) {
  const decoded = jwt.decode(token);
  if (!decoded) return;
  
  // Store until token would expire
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    await redis.setex(`blacklist:${token}`, ttl, '1');
  }
}

// Check if token is blacklisted
async function isBlacklisted(token) {
  const result = await redis.get(`blacklist:${token}`);
  return result === '1';
}

// Middleware with blacklist check
async function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  // Check blacklist
  if (await isBlacklisted(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Logout with blacklisting
app.post('/auth/logout', authenticateToken, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  await blacklistToken(token);
  res.json({ message: 'Logged out' });
});
```

## Password Reset with JWT

```javascript
// Request password reset
app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user) {
    // Don't reveal if user exists
    return res.json({ message: 'If email exists, reset link sent' });
  }
  
  // Generate reset token
  const resetToken = jwt.sign(
    { userId: user.id, purpose: 'password-reset' },
    JWT_SECRET + user.password,  // Include password hash in secret
    { expiresIn: '1h' }
  );
  
  // Send email with reset link
  await sendEmail(email, `Reset link: /reset-password?token=${resetToken}`);
  
  res.json({ message: 'If email exists, reset link sent' });
});

// Reset password
app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  // Decode without verification first to get userId
  const decoded = jwt.decode(token);
  if (!decoded || decoded.purpose !== 'password-reset') {
    return res.status(400).json({ error: 'Invalid token' });
  }
  
  const user = users.find(u => u.id === decoded.userId);
  if (!user) {
    return res.status(400).json({ error: 'Invalid token' });
  }
  
  // Verify with user's current password hash
  try {
    jwt.verify(token, JWT_SECRET + user.password);
  } catch (error) {
    return res.status(400).json({ error: 'Token expired or invalid' });
  }
  
  // Update password
  user.password = await bcrypt.hash(newPassword, 12);
  
  res.json({ message: 'Password updated' });
});
```

## Security Best Practices

### Strong Secret Keys

```javascript
// Generate strong secret
const crypto = require('crypto');
const secret = crypto.randomBytes(64).toString('hex');

// Use environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable required');
}
```

### Token Payload Best Practices

```javascript
// Good: Minimal payload
const token = jwt.sign({
  sub: user.id,  // Subject (user ID)
  iat: Date.now(),  // Issued at (automatic)
}, JWT_SECRET, { expiresIn: '15m' });

// Bad: Sensitive data in payload
const token = jwt.sign({
  userId: user.id,
  email: user.email,
  password: user.password,  // NEVER DO THIS
  creditCard: '...',        // NEVER DO THIS
}, JWT_SECRET);
```

### Algorithm Security

```javascript
// Explicitly specify algorithm
const token = jwt.sign(payload, JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: '15m',
});

// Verify with algorithm restriction
const decoded = jwt.verify(token, JWT_SECRET, {
  algorithms: ['HS256'],  // Only accept HS256
});
```

## Summary

| Feature | Implementation |
|---------|----------------|
| Token generation | `jwt.sign(payload, secret, options)` |
| Token verification | `jwt.verify(token, secret)` |
| Access token | Short-lived (15 min) |
| Refresh token | Long-lived (7 days), rotate on use |
| Storage | HTTP-only cookies (web) |
| Revocation | Token blacklist with Redis |
| Authorization | Role-based middleware |

Best practices:
- Use short-lived access tokens (15 minutes)
- Implement refresh token rotation
- Store tokens in HTTP-only cookies for web
- Use strong, unique secrets
- Never store sensitive data in JWT payload
- Implement token blacklisting for logout
- Use HTTPS in production
