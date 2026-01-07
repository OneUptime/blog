# How to Handle JWT Authentication Securely in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Security, Authentication, API, DevOps

Description: Learn secure JWT authentication patterns in Node.js including refresh token rotation, token revocation, and protection against common attacks.

---

JSON Web Tokens (JWTs) are the standard for API authentication, but they're frequently implemented insecurely. Stolen tokens, missing expiration, and improper storage lead to compromised accounts. This guide covers secure JWT patterns that protect your users and your system.

## JWT Structure and Security Fundamentals

A JWT consists of three parts:

```
Header.Payload.Signature
```

A JWT contains three base64-encoded parts: the header specifies the signing algorithm, the payload contains claims (user data and metadata), and the signature ensures the token hasn't been tampered with.

```javascript
// Header - describes the token type and signing algorithm
{
  "alg": "HS256",  // HMAC-SHA256 signing algorithm
  "typ": "JWT"     // Token type
}

// Payload - contains claims about the user and token
{
  "sub": "user123",           // Subject: identifies the user
  "iat": 1704067200,          // Issued At: when token was created (Unix timestamp)
  "exp": 1704068100,          // Expiration: when token expires (Unix timestamp)
  "roles": ["user"]           // Custom claims: application-specific data
}

// Signature - verifies token integrity
// Created by signing header + payload with the secret key
HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

### Security Golden Rules

| Rule | Why |
|------|-----|
| Short expiration | Limits damage from stolen tokens |
| Use refresh tokens | Allows token renewal without re-auth |
| Rotate refresh tokens | Detects token theft |
| Store securely | httpOnly cookies or secure storage |
| Validate all claims | Prevents token abuse |

## Basic Secure JWT Implementation

This implementation demonstrates secure token generation with separate secrets for access and refresh tokens, proper expiration times, and validation at startup to catch configuration errors early.

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuration with separate secrets for access and refresh tokens
// Using different secrets prevents token type confusion attacks
const config = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: '15m', // Short-lived: limits damage if stolen
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '7d',  // Longer-lived but requires rotation
  },
};

// Fail fast: validate configuration at application startup
// Prevents running with weak or missing secrets
if (!config.accessToken.secret || config.accessToken.secret.length < 32) {
  throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
}

// Generate both access and refresh tokens for a user
function generateTokens(user) {
  // Access token: used for API authentication
  // Contains user info needed for authorization decisions
  const accessToken = jwt.sign(
    {
      sub: user.id,           // Subject: user identifier
      email: user.email,      // Include for convenience
      roles: user.roles,      // For role-based access control
      type: 'access',         // Token type for validation
    },
    config.accessToken.secret,
    {
      expiresIn: config.accessToken.expiresIn,
      algorithm: 'HS256',     // Explicit algorithm prevents substitution
      issuer: 'your-app',     // Validates token origin
      audience: 'your-api',   // Validates intended recipient
    }
  );

  // Generate unique ID for refresh token revocation tracking
  const refreshTokenId = crypto.randomUUID();

  // Refresh token: used only to get new access tokens
  // Minimal payload - just enough to identify user and token
  const refreshToken = jwt.sign(
    {
      sub: user.id,
      jti: refreshTokenId,    // JWT ID: unique identifier for revocation
      type: 'refresh',        // Token type for validation
    },
    config.refreshToken.secret,
    {
      expiresIn: config.refreshToken.expiresIn,
      algorithm: 'HS256',
      issuer: 'your-app',
    }
  );

  return {
    accessToken,
    refreshToken,
    refreshTokenId,  // Store this for revocation tracking
  };
}

// Verify and decode an access token
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.accessToken.secret, {
      algorithms: ['HS256'], // CRITICAL: prevents algorithm substitution attacks
      issuer: 'your-app',    // Verify token was issued by us
      audience: 'your-api',  // Verify token was meant for us
    });

    // Ensure this is actually an access token, not a refresh token
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

## Refresh Token Rotation

Rotating refresh tokens on each use detects token theft. If an attacker steals a refresh token and uses it, the legitimate user's next refresh attempt will fail, triggering a security alert. This pattern is critical for detecting and responding to compromised tokens.

```javascript
// In-memory store for development (use Redis in production)
const refreshTokenStore = new Map();

// Store a refresh token with metadata for security tracking
async function storeRefreshToken(userId, tokenId, metadata) {
  const key = `refresh:${userId}`;
  let userTokens = refreshTokenStore.get(key) || [];

  // Limit active sessions per user (e.g., max 5 devices)
  // Prevents unlimited token accumulation
  if (userTokens.length >= 5) {
    userTokens = userTokens.slice(-4); // Remove oldest, keep last 4
  }

  userTokens.push({
    tokenId,
    createdAt: Date.now(),
    ...metadata,  // Store IP, user agent for session management UI
  });

  refreshTokenStore.set(key, userTokens);
}

// Revoke a specific refresh token (used after rotation or logout)
async function revokeRefreshToken(userId, tokenId) {
  const key = `refresh:${userId}`;
  const userTokens = refreshTokenStore.get(key) || [];
  // Filter out the revoked token
  refreshTokenStore.set(key, userTokens.filter(t => t.tokenId !== tokenId));
}

// Check if a refresh token is still valid (not revoked)
async function isRefreshTokenValid(userId, tokenId) {
  const key = `refresh:${userId}`;
  const userTokens = refreshTokenStore.get(key) || [];
  return userTokens.some(t => t.tokenId === tokenId);
}

// Nuclear option: revoke ALL user tokens (password change, security breach)
async function revokeAllUserTokens(userId) {
  const key = `refresh:${userId}`;
  refreshTokenStore.delete(key);
}

// Token refresh endpoint with rotation
// This is the core of the security model - each refresh invalidates the old token
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    // Step 1: Verify the refresh token signature and claims
    const decoded = jwt.verify(refreshToken, config.refreshToken.secret, {
      algorithms: ['HS256'],
    });

    // Ensure we're dealing with a refresh token, not an access token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Step 2: Check if token is in our store (not already used/revoked)
    const isValid = await isRefreshTokenValid(decoded.sub, decoded.jti);
    if (!isValid) {
      // SECURITY ALERT: Token was already used or revoked
      // This could indicate token theft - attacker used it before user
      // Revoke ALL user tokens as a security precaution
      await revokeAllUserTokens(decoded.sub);

      console.warn(`Refresh token reuse detected for user ${decoded.sub}`);
      return res.status(401).json({
        error: 'Token revoked',
        message: 'Please log in again',
      });
    }

    // Step 3: Immediately revoke the used refresh token (rotation)
    // Even if the response fails, the old token is now invalid
    await revokeRefreshToken(decoded.sub, decoded.jti);

    // Step 4: Get fresh user data (roles may have changed)
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Step 5: Generate new token pair
    const tokens = generateTokens(user);

    // Step 6: Store new refresh token for future validation
    await storeRefreshToken(user.id, tokens.refreshTokenId, {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    // Return new tokens to client
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

## Authentication Middleware

```javascript
// Middleware to protect routes
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);
  const result = verifyAccessToken(token);

  if (!result.valid) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: result.error,
    });
  }

  req.user = {
    id: result.decoded.sub,
    email: result.decoded.email,
    roles: result.decoded.roles,
  };

  next();
}

// Role-based authorization
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasRole = roles.some(role => req.user.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Usage
app.get('/api/admin', authenticate, authorize('admin'), (req, res) => {
  res.json({ message: 'Admin content' });
});
```

## Secure Cookie-Based Tokens

For web applications, httpOnly cookies are more secure than localStorage:

```javascript
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const tokens = generateTokens(user);
  await storeRefreshToken(user.id, tokens.refreshTokenId, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,           // Not accessible via JavaScript
    secure: true,             // Only sent over HTTPS
    sameSite: 'strict',       // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/auth',            // Only sent to auth endpoints
  });

  // Return access token in response body
  res.json({
    accessToken: tokens.accessToken,
    user: {
      id: user.id,
      email: user.email,
    },
  });
});

// Refresh endpoint using cookie
app.post('/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  // ... verify and rotate as before

  // Set new refresh token cookie
  res.cookie('refreshToken', newTokens.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/auth',
  });

  res.json({ accessToken: newTokens.accessToken });
});

// Logout - clear cookie and revoke token
app.post('/auth/logout', authenticate, async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.refreshToken.secret);
      await revokeRefreshToken(decoded.sub, decoded.jti);
    } catch (error) {
      // Token invalid, but still clear cookie
    }
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/auth',
  });

  res.json({ message: 'Logged out' });
});
```

## Protecting Against Common Attacks

### Algorithm Substitution Attack

```javascript
// BAD - allows algorithm to be changed
jwt.verify(token, secret);

// GOOD - explicitly specify allowed algorithms
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

### None Algorithm Attack

```javascript
// Never allow 'none' algorithm
const decoded = jwt.verify(token, secret, {
  algorithms: ['HS256'], // Only allow HMAC
  // Never include 'none' in algorithms array
});
```

### Key Confusion Attack (RS256/HS256)

```javascript
// If using asymmetric keys
const publicKey = fs.readFileSync('public.pem');

// BAD - could be tricked into using public key as HMAC secret
jwt.verify(token, publicKey);

// GOOD - explicitly require RS256
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

### Token Sidejacking (XSS + Token Theft)

```javascript
// For mobile/SPA where cookies aren't possible:
// 1. Store tokens in memory only
// 2. Use short expiration (5-15 minutes)
// 3. Implement fingerprinting

function generateTokenWithFingerprint(user, req) {
  // Generate unique fingerprint from client characteristics
  const fingerprint = crypto
    .createHash('sha256')
    .update(req.get('User-Agent') || '')
    .update(req.ip)
    .digest('hex');

  const accessToken = jwt.sign(
    {
      sub: user.id,
      fingerprint: fingerprint.substring(0, 16),
    },
    config.accessToken.secret,
    { expiresIn: '15m' }
  );

  return accessToken;
}

// Verify fingerprint in middleware
function authenticateWithFingerprint(req, res, next) {
  // ... verify token

  const expectedFingerprint = crypto
    .createHash('sha256')
    .update(req.get('User-Agent') || '')
    .update(req.ip)
    .digest('hex')
    .substring(0, 16);

  if (decoded.fingerprint !== expectedFingerprint) {
    return res.status(401).json({ error: 'Token fingerprint mismatch' });
  }

  // ... continue
}
```

## Asymmetric Keys (RS256)

For microservices where you need different signing and verification keys:

```javascript
const fs = require('fs');

const privateKey = fs.readFileSync('private.pem');
const publicKey = fs.readFileSync('public.pem');

// Sign with private key (auth service only)
function generateToken(user) {
  return jwt.sign(
    { sub: user.id, roles: user.roles },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '15m',
      issuer: 'auth-service',
    }
  );
}

// Verify with public key (any service)
function verifyToken(token) {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'auth-service',
  });
}
```

Generate keys:

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem
```

## Session Management

Track active sessions for security and UX:

```javascript
class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  async createSession(userId, refreshTokenId, metadata) {
    const session = {
      id: refreshTokenId,
      userId,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      userAgent: metadata.userAgent,
      ip: metadata.ip,
      location: await this.geolocate(metadata.ip),
    };

    const userSessions = this.sessions.get(userId) || [];
    userSessions.push(session);
    this.sessions.set(userId, userSessions);

    return session;
  }

  async getUserSessions(userId) {
    return this.sessions.get(userId) || [];
  }

  async revokeSession(userId, sessionId) {
    const userSessions = this.sessions.get(userId) || [];
    this.sessions.set(
      userId,
      userSessions.filter(s => s.id !== sessionId)
    );
  }

  async revokeAllSessions(userId, exceptSessionId = null) {
    if (exceptSessionId) {
      const userSessions = this.sessions.get(userId) || [];
      this.sessions.set(
        userId,
        userSessions.filter(s => s.id === exceptSessionId)
      );
    } else {
      this.sessions.delete(userId);
    }
  }

  async geolocate(ip) {
    // Integrate with IP geolocation service
    return 'Unknown';
  }
}

const sessionManager = new SessionManager();

// List user sessions
app.get('/auth/sessions', authenticate, async (req, res) => {
  const sessions = await sessionManager.getUserSessions(req.user.id);

  // Don't expose sensitive data
  const sanitized = sessions.map(s => ({
    id: s.id,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    device: parseUserAgent(s.userAgent),
    location: s.location,
    current: s.id === req.currentSessionId,
  }));

  res.json(sanitized);
});

// Revoke specific session
app.delete('/auth/sessions/:id', authenticate, async (req, res) => {
  await sessionManager.revokeSession(req.user.id, req.params.id);
  await revokeRefreshToken(req.user.id, req.params.id);
  res.json({ message: 'Session revoked' });
});

// Revoke all other sessions
app.post('/auth/sessions/revoke-others', authenticate, async (req, res) => {
  await sessionManager.revokeAllSessions(req.user.id, req.currentSessionId);
  res.json({ message: 'All other sessions revoked' });
});
```

## Security Checklist

| Item | Implementation |
|------|----------------|
| Short access token expiry | 5-15 minutes |
| Refresh token rotation | New token on each refresh |
| Revocation capability | Store refresh token IDs |
| Secure storage | httpOnly cookies or memory |
| Algorithm restriction | Explicit in verify() |
| Audience/Issuer validation | Validate in verify() |
| HTTPS only | secure: true for cookies |
| Session management | Track and allow revocation |

Secure JWT authentication requires careful implementation across token generation, storage, rotation, and revocation. These patterns protect your users from token theft and session hijacking while maintaining a good user experience.
