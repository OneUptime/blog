# How to Secure Node.js APIs Against Common Vulnerabilities (OWASP Top 10)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Security, API, DevOps, Authentication

Description: A comprehensive guide to securing Node.js APIs against OWASP Top 10 vulnerabilities including input validation, SQL injection prevention, XSS protection, and authentication hardening.

---

Security vulnerabilities in APIs can expose user data, compromise systems, and destroy trust. The OWASP Top 10 represents the most critical security risks for web applications. This guide covers how to protect your Node.js APIs against each of these threats with practical, implementable code.

## The OWASP Top 10 (2021)

| Rank | Vulnerability | Node.js Risk Level |
|------|--------------|-------------------|
| A01 | Broken Access Control | High |
| A02 | Cryptographic Failures | High |
| A03 | Injection | Critical |
| A04 | Insecure Design | Medium |
| A05 | Security Misconfiguration | High |
| A06 | Vulnerable Components | High |
| A07 | Auth Failures | Critical |
| A08 | Software/Data Integrity | Medium |
| A09 | Logging Failures | Medium |
| A10 | SSRF | Medium |

## A01: Broken Access Control

### The Problem

Users accessing resources they shouldn't: viewing other users' data, modifying permissions, or accessing admin functions.

### Prevention

```javascript
// middleware/authorization.js
const authorize = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.roles.includes(requiredRole)) {
      // Log the access attempt
      console.warn(`Unauthorized access attempt: User ${req.user.id} tried to access ${req.path}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Resource ownership check
const ownsResource = (resourceUserIdField) => {
  return async (req, res, next) => {
    const resource = req.resource; // Loaded by previous middleware

    if (resource[resourceUserIdField] !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

// Usage
app.get('/users/:id', authenticate, loadUser, ownsResource('id'), (req, res) => {
  res.json(req.resource);
});

app.delete('/admin/users/:id', authenticate, authorize('admin'), async (req, res) => {
  // Only admins can delete users
});
```

### Preventing IDOR (Insecure Direct Object References)

```javascript
// BAD: Direct database ID in URL
app.get('/invoices/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id); // Anyone can access any invoice
  res.json(invoice);
});

// GOOD: Verify ownership
app.get('/invoices/:id', authenticate, async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    userId: req.user.id, // Must belong to authenticated user
  });

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json(invoice);
});
```

## A02: Cryptographic Failures

### Secure Password Hashing

```javascript
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12; // Adjust based on your security needs

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// User registration
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Validate password strength
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      error: 'Password must be at least 12 characters with uppercase, lowercase, number, and symbol'
    });
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    email,
    password: hashedPassword,
  });

  res.status(201).json({ id: user.id, email: user.email });
});
```

### Secure Data Encryption

```javascript
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

function decrypt({ encrypted, iv, authTag }) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Secure Configuration

```javascript
// Never commit secrets to code
// Use environment variables or secret managers

// BAD
const JWT_SECRET = 'my-secret-key';

// GOOD
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters');
}
```

## A03: Injection (SQL, NoSQL, Command)

### SQL Injection Prevention

```javascript
// BAD: String concatenation
async function getUserBad(username) {
  const query = `SELECT * FROM users WHERE username = '${username}'`;
  // Attacker input: ' OR '1'='1
  return db.query(query);
}

// GOOD: Parameterized queries
async function getUser(username) {
  const query = 'SELECT * FROM users WHERE username = $1';
  return db.query(query, [username]);
}

// With an ORM (Sequelize)
async function getUser(username) {
  return User.findOne({ where: { username } });
}
```

### NoSQL Injection Prevention

```javascript
// BAD: Direct user input in query
app.post('/login', async (req, res) => {
  const user = await User.findOne({
    username: req.body.username,
    password: req.body.password, // Attacker: { "$gt": "" }
  });
});

// GOOD: Validate and sanitize input
const { body, validationResult } = require('express-validator');

app.post('/login',
  body('username').isString().trim().escape(),
  body('password').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Ensure fields are strings, not objects
    const username = String(req.body.username);
    const password = String(req.body.password);

    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token...
  }
);
```

### Command Injection Prevention

```javascript
// BAD: Using user input in shell commands
const { exec } = require('child_process');

app.get('/ping', (req, res) => {
  exec(`ping -c 4 ${req.query.host}`, (error, stdout) => {
    // Attacker: host=google.com; rm -rf /
    res.send(stdout);
  });
});

// GOOD: Use execFile with arguments array
const { execFile } = require('child_process');

app.get('/ping', (req, res) => {
  // Validate input
  const host = req.query.host;
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
    return res.status(400).json({ error: 'Invalid hostname' });
  }

  execFile('ping', ['-c', '4', host], (error, stdout) => {
    if (error) {
      return res.status(500).json({ error: 'Ping failed' });
    }
    res.send(stdout);
  });
});
```

## A04: Insecure Design

### Implement Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Strict limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  skipSuccessfulRequests: true, // Don't count successful logins
  message: { error: 'Too many login attempts, please try again later' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

### Implement Business Logic Validation

```javascript
// Example: Preventing negative transfers
app.post('/transfer', authenticate, async (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body;

  // Validate amount
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  // Verify ownership
  const fromAccount = await Account.findOne({
    _id: fromAccountId,
    userId: req.user.id,
  });

  if (!fromAccount) {
    return res.status(404).json({ error: 'Source account not found' });
  }

  // Check sufficient balance
  if (fromAccount.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Prevent self-transfer
  if (fromAccountId === toAccountId) {
    return res.status(400).json({ error: 'Cannot transfer to same account' });
  }

  // Perform transfer atomically
  await performTransfer(fromAccountId, toAccountId, amount);

  res.json({ success: true });
});
```

## A05: Security Misconfiguration

### Security Headers with Helmet

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));
```

### Secure CORS Configuration

```javascript
const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24 hours
};

app.use(cors(corsOptions));
```

### Disable Debug Information in Production

```javascript
// Express error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (process.env.NODE_ENV === 'production') {
    // Don't leak stack traces in production
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
});
```

## A06: Vulnerable and Outdated Components

### Automated Dependency Auditing

```json
// package.json
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "outdated": "npm outdated"
  }
}
```

### CI/CD Security Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *' # Daily

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm audit --audit-level=high

  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## A07: Identification and Authentication Failures

### Secure JWT Implementation

```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roles: user.roles,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256',
    }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check token type
    if (decoded.type === 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Token Refresh with Rotation

```javascript
// Store refresh tokens with revocation capability
const refreshTokens = new Map(); // Use Redis in production

app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if token is revoked
    if (refreshTokens.get(refreshToken) === 'revoked') {
      return res.status(401).json({ error: 'Token revoked' });
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Revoke old refresh token
    refreshTokens.set(refreshToken, 'revoked');

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json(tokens);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

## A08: Software and Data Integrity Failures

### Verify Package Integrity

```json
// package.json - Use lockfile
{
  "scripts": {
    "install": "npm ci" // Use ci instead of install for deterministic installs
  }
}
```

### Subresource Integrity for CDN Resources

```html
<script
  src="https://cdn.example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

## A09: Security Logging and Monitoring Failures

### Comprehensive Security Logging

```javascript
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
  ],
});

// Log authentication events
function logAuthEvent(event, req, details = {}) {
  securityLogger.info({
    event,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    path: req.path,
    ...details,
  });
}

// Middleware to log failed authentications
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !await bcrypt.compare(password, user.password)) {
    logAuthEvent('LOGIN_FAILED', req, { email });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  logAuthEvent('LOGIN_SUCCESS', req, { userId: user.id });

  const tokens = generateTokens(user);
  res.json(tokens);
});

// Log access control violations
app.use((err, req, res, next) => {
  if (err.status === 403) {
    logAuthEvent('ACCESS_DENIED', req, {
      resource: req.path,
      method: req.method,
    });
  }
  next(err);
});
```

## A10: Server-Side Request Forgery (SSRF)

### Validate and Restrict URLs

```javascript
const { URL } = require('url');
const dns = require('dns').promises;

// Blocked IP ranges (internal networks)
const BLOCKED_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
];

async function isUrlSafe(urlString) {
  try {
    const url = new URL(urlString);

    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    // Resolve hostname to IP
    const addresses = await dns.resolve4(url.hostname);

    // Check if any resolved IP is in blocked ranges
    for (const ip of addresses) {
      for (const range of BLOCKED_RANGES) {
        if (range.test(ip)) {
          console.warn(`Blocked SSRF attempt to ${ip}`);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Usage
app.post('/fetch-url', async (req, res) => {
  const { url } = req.body;

  if (!await isUrlSafe(url)) {
    return res.status(400).json({ error: 'URL not allowed' });
  }

  // Safe to fetch
  const response = await fetch(url);
  res.json(await response.json());
});
```

## Security Checklist

| Category | Measure | Priority |
|----------|---------|----------|
| **Auth** | Use bcrypt with cost 12+ | Critical |
| **Auth** | Implement JWT with short expiry | Critical |
| **Input** | Validate all user input | Critical |
| **Input** | Use parameterized queries | Critical |
| **Config** | Set security headers | High |
| **Config** | Configure CORS strictly | High |
| **Config** | Disable debug in production | High |
| **Deps** | Audit dependencies weekly | High |
| **Access** | Implement RBAC | High |
| **Access** | Verify resource ownership | High |
| **Logging** | Log all auth events | Medium |
| **SSRF** | Validate external URLs | Medium |

Security is not a one-time implementation but an ongoing practice. Regular security audits, penetration testing, and staying updated with new vulnerabilities are essential to maintaining a secure Node.js API.
