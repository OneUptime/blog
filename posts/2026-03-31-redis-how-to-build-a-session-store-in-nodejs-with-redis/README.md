# How to Build a Session Store in Node.js with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Session, Express, Authentication

Description: Learn how to build a scalable session store in Node.js using Redis and connect-redis, replacing in-memory sessions for multi-instance deployments.

---

## Why Redis for Session Storage

The default in-memory session store in Express is not suitable for production:
- Sessions are lost on server restart
- Sessions cannot be shared across multiple Node.js instances
- Memory grows unbounded with active sessions

Redis solves all these problems: sessions persist across restarts, are shared across all instances of your application, and expire automatically via TTL.

## Installing Dependencies

```bash
npm install express express-session connect-redis redis
```

## Basic Setup with Express

```javascript
const express = require('express');
const session = require('express-session');
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;

const app = express();

// Create Redis client
const redisClient = createClient({
  url: 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
  }
});

redisClient.on('error', (err) => console.error('Redis client error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Connect before starting the server
redisClient.connect();

// Configure session middleware
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

## Login and Logout Routes

```javascript
app.use(express.json());

// Mock user database
const users = {
  'alice@example.com': { id: 1, name: 'Alice', passwordHash: 'hashed_password' }
};

// Login route
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users[email];

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // In production, verify password hash here
  // const valid = await bcrypt.compare(password, user.passwordHash);

  // Store user info in session
  req.session.userId = user.id;
  req.session.email = email;
  req.session.loginAt = new Date().toISOString();

  res.json({ message: 'Logged in', userId: user.id });
});

// Logout route
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// Get current session
app.get('/auth/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({
    userId: req.session.userId,
    email: req.session.email,
    loginAt: req.session.loginAt
  });
});
```

## Authentication Middleware

```javascript
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Protect routes with the middleware
app.get('/api/profile', requireAuth, (req, res) => {
  res.json({ userId: req.session.userId, email: req.session.email });
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  res.json({ message: `Welcome, ${req.session.email}` });
});
```

## Custom Session Key Prefix

By default, connect-redis stores sessions as `sess:<sessionId>`. Customize the prefix:
```javascript
const store = new RedisStore({
  client: redisClient,
  prefix: 'myapp:session:',
  ttl: 86400 // 24 hours (overrides cookie.maxAge)
});
```

View sessions in Redis:
```bash
redis-cli KEYS "myapp:session:*"
redis-cli GET "myapp:session:abc123xyz"
```

## Session Data with TypeScript

```typescript
import express, { Request, Response } from 'express';
import session from 'express-session';

// Extend session type
declare module 'express-session' {
  interface SessionData {
    userId: number;
    email: string;
    roles: string[];
    loginAt: string;
  }
}

const app = express();

app.post('/auth/login', (req: Request, res: Response) => {
  req.session.userId = 1;
  req.session.email = 'alice@example.com';
  req.session.roles = ['admin', 'user'];
  req.session.loginAt = new Date().toISOString();
  res.json({ message: 'Logged in' });
});
```

## Handling Redis Connection Failures

Make your session store resilient to Redis downtime:
```javascript
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;
const session = require('express-session');

const redisClient = createClient({ url: 'redis://localhost:6379' });

// Fall back to in-memory store if Redis is unavailable
async function initializeSession(app) {
  let sessionStore;
  try {
    await redisClient.connect();
    sessionStore = new RedisStore({ client: redisClient });
    console.log('Using Redis session store');
  } catch (err) {
    console.warn('Redis unavailable, using in-memory session store (not suitable for production)');
    sessionStore = new session.MemoryStore();
  }

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }));
}

initializeSession(app);
```

## Session Management Operations

View and revoke sessions manually:
```javascript
// List all active sessions for a user (requires custom indexing)
app.get('/admin/sessions/:userId', requireAuth, async (req, res) => {
  const keys = await redisClient.keys(`myapp:session:*`);
  const sessions = [];

  for (const key of keys) {
    const data = await redisClient.get(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.userId === parseInt(req.params.userId)) {
        sessions.push({ key, data: parsed });
      }
    }
  }

  res.json({ sessions });
});

// Revoke all sessions for a user
app.delete('/admin/sessions/:userId', requireAuth, async (req, res) => {
  const keys = await redisClient.keys('myapp:session:*');
  let revoked = 0;

  for (const key of keys) {
    const data = await redisClient.get(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.userId === parseInt(req.params.userId)) {
        await redisClient.del(key);
        revoked++;
      }
    }
  }

  res.json({ revoked });
});
```

## Starting the Server

```javascript
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Summary

Redis-backed sessions in Node.js enable scalable, persistent authentication across multiple application instances. Use `connect-redis` with `express-session` to store sessions in Redis with automatic TTL-based expiration. Configure the cookie as `httpOnly` and `secure` in production, use a custom key prefix for easy key management, and implement graceful degradation if Redis becomes temporarily unavailable.
