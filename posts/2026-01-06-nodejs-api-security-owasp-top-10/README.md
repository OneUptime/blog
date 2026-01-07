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

Implement role-based access control (RBAC) middleware to validate user permissions before processing requests. This approach ensures that both the user's authentication status and their specific role permissions are verified at each protected endpoint.

```javascript
// middleware/authorization.js

// Middleware factory that creates a role-checking function
// Takes the required role as parameter and returns an Express middleware
const authorize = (requiredRole) => {
  return (req, res, next) => {
    // First, verify user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has the required role in their roles array
    if (!req.user.roles.includes(requiredRole)) {
      // Log the access attempt for security monitoring
      console.warn(`Unauthorized access attempt: User ${req.user.id} tried to access ${req.path}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // User has required role, proceed to next middleware
    next();
  };
};

// Resource ownership check middleware
// Verifies that the authenticated user owns the requested resource
const ownsResource = (resourceUserIdField) => {
  return async (req, res, next) => {
    // Resource should be loaded by previous middleware (e.g., loadUser)
    const resource = req.resource;

    // Allow access if user owns resource OR user is admin
    if (resource[resourceUserIdField] !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

// Usage examples showing middleware chain
// Users can only view their own profile (or admin can view any)
app.get('/users/:id', authenticate, loadUser, ownsResource('id'), (req, res) => {
  res.json(req.resource);
});

// Only admins can delete users
app.delete('/admin/users/:id', authenticate, authorize('admin'), async (req, res) => {
  // Only admins can delete users
});
```

### Preventing IDOR (Insecure Direct Object References)

IDOR vulnerabilities occur when an application exposes internal object references (like database IDs) without proper authorization checks. The fix is to always include the user's identity in database queries to ensure they can only access their own resources.

```javascript
// BAD: Direct database ID in URL - vulnerable to IDOR attacks
// An attacker can simply change the ID in the URL to access other users' invoices
app.get('/invoices/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id); // Anyone can access any invoice!
  res.json(invoice);
});

// GOOD: Verify ownership by including userId in the query
// This ensures the invoice belongs to the authenticated user
app.get('/invoices/:id', authenticate, async (req, res) => {
  // Query requires BOTH the invoice ID AND the user's ID to match
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    userId: req.user.id, // Must belong to authenticated user
  });

  // Return 404 for both "not found" and "unauthorized" to prevent enumeration
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json(invoice);
});
```

## A02: Cryptographic Failures

### Secure Password Hashing

Never store passwords in plain text. Use bcrypt with an appropriate cost factor to hash passwords. Bcrypt automatically handles salt generation and applies key stretching to make brute-force attacks computationally expensive.

```javascript
const bcrypt = require('bcrypt');

// Cost factor of 12 provides good security (~250ms per hash)
// Increase for higher security, decrease for faster auth (minimum 10)
const SALT_ROUNDS = 12;

// Hash a plaintext password for storage
async function hashPassword(password) {
  // bcrypt.hash automatically generates a random salt
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify a password against stored hash
async function verifyPassword(password, hash) {
  // bcrypt.compare is timing-safe to prevent timing attacks
  return bcrypt.compare(password, hash);
}

// User registration endpoint
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Enforce password complexity requirements
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      error: 'Password must be at least 12 characters with uppercase, lowercase, number, and symbol'
    });
  }

  // Hash password before storing - NEVER store plaintext passwords
  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    email,
    password: hashedPassword, // Store only the hash
  });

  // Don't return the password hash in the response
  res.status(201).json({ id: user.id, email: user.email });
});
```

### Secure Data Encryption

For encrypting sensitive data at rest, use AES-256-GCM which provides both confidentiality and integrity. Always generate a unique initialization vector (IV) for each encryption operation, and store the auth tag alongside the ciphertext to detect tampering.

```javascript
const crypto = require('crypto');

// AES-256-GCM provides authenticated encryption
// It prevents both reading AND tampering with encrypted data
const ALGORITHM = 'aes-256-gcm';

// Key must be exactly 32 bytes (256 bits) for AES-256
// Store this securely in environment variables, never in code
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function encrypt(plaintext) {
  // Generate a unique IV for each encryption - NEVER reuse IVs
  const iv = crypto.randomBytes(16);

  // Create cipher with algorithm, key, and IV
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  // Encrypt the plaintext
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get the authentication tag for integrity verification
  const authTag = cipher.getAuthTag();

  // Return all components needed for decryption
  return {
    encrypted,
    iv: iv.toString('hex'),       // Must be stored with ciphertext
    authTag: authTag.toString('hex'), // Required to verify integrity
  };
}

function decrypt({ encrypted, iv, authTag }) {
  // Create decipher with same algorithm, key, and original IV
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex')
  );

  // Set auth tag before decryption - will throw if data was tampered
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  // Decrypt the ciphertext
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Secure Configuration

Never hardcode secrets in your source code. They can be extracted from version control history, compiled binaries, or client-side JavaScript. Always use environment variables or dedicated secret management systems.

```javascript
// Never commit secrets to code - they'll live in git history forever!
// Use environment variables or secret managers like AWS Secrets Manager, HashiCorp Vault

// BAD - Secret is exposed in source code and version control
const JWT_SECRET = 'my-secret-key';

// GOOD - Secret loaded from environment variable
const JWT_SECRET = process.env.JWT_SECRET;

// Validate that required secrets are present and meet security requirements
// Application should fail fast if misconfigured rather than run insecurely
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters');
}
```

## A03: Injection (SQL, NoSQL, Command)

### SQL Injection Prevention

SQL injection allows attackers to manipulate database queries by inserting malicious SQL code through user input. Prevent this by using parameterized queries (also called prepared statements) which separate SQL code from data.

```javascript
// BAD: String concatenation - vulnerable to SQL injection
// Attacker input: ' OR '1'='1 would return all users!
async function getUserBad(username) {
  // User input is directly concatenated into query string
  const query = `SELECT * FROM users WHERE username = '${username}'`;
  return db.query(query);
}

// GOOD: Parameterized queries - safe from SQL injection
async function getUser(username) {
  // $1 is a placeholder, actual value passed separately
  // The database driver handles proper escaping
  const query = 'SELECT * FROM users WHERE username = $1';
  return db.query(query, [username]);
}

// BETTER: Use an ORM like Sequelize which handles parameterization automatically
async function getUser(username) {
  // ORM methods use parameterized queries internally
  return User.findOne({ where: { username } });
}
```

### NoSQL Injection Prevention

NoSQL databases like MongoDB are also vulnerable to injection attacks. Attackers can pass objects instead of strings to manipulate queries. For example, passing `{ "$gt": "" }` as the password field would match any non-empty password, bypassing authentication.

```javascript
// BAD: Direct user input in query - vulnerable to NoSQL injection
app.post('/login', async (req, res) => {
  // If attacker sends password: { "$gt": "" }, this matches any password!
  const user = await User.findOne({
    username: req.body.username,
    password: req.body.password, // Danger: could be an object, not a string
  });
});

// GOOD: Validate and sanitize input using express-validator
const { body, validationResult } = require('express-validator');

app.post('/login',
  // Validation middleware - ensures inputs are strings, not objects
  body('username').isString().trim().escape(),
  body('password').isString(),
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Explicitly coerce to strings as additional protection
    const username = String(req.body.username);
    const password = String(req.body.password);

    // Find user by username only, then verify password separately
    const user = await User.findOne({ username });

    // Use bcrypt.compare for timing-safe password verification
    if (!user || !await bcrypt.compare(password, user.password)) {
      // Use same error message for both cases to prevent user enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token...
  }
);
```

### Command Injection Prevention

Command injection occurs when user input is passed to shell commands without proper sanitization. Attackers can append additional commands using shell metacharacters like `;`, `|`, or `&&`. Use `execFile` instead of `exec` to prevent shell interpretation.

```javascript
// BAD: Using user input in shell commands - vulnerable to command injection
const { exec } = require('child_process');

app.get('/ping', (req, res) => {
  // DANGER: exec() runs through shell, interpreting metacharacters
  // Attacker input: "google.com; rm -rf /" would execute both commands!
  exec(`ping -c 4 ${req.query.host}`, (error, stdout) => {
    res.send(stdout);
  });
});

// GOOD: Use execFile with arguments array - bypasses shell entirely
const { execFile } = require('child_process');

app.get('/ping', (req, res) => {
  const host = req.query.host;

  // Whitelist validation - only allow safe characters in hostname
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
    return res.status(400).json({ error: 'Invalid hostname' });
  }

  // execFile doesn't use shell, so metacharacters aren't interpreted
  // Arguments are passed as array, preventing injection
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

Rate limiting protects your API from brute-force attacks, denial of service, and abuse. Apply stricter limits on sensitive endpoints like authentication. The `express-rate-limit` middleware provides easy configuration for different scenarios.

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limit - prevents abuse and DoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 100,                  // Limit to 100 requests per window
  standardHeaders: true,     // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,      // Disable X-RateLimit-* headers
  message: { error: 'Too many requests, please try again later' },
});

// Strict limit for authentication endpoints - prevents brute-force attacks
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1-hour window
  max: 5,                      // Only 5 failed attempts per hour
  skipSuccessfulRequests: true, // Don't count successful logins against limit
  message: { error: 'Too many login attempts, please try again later' },
});

// Apply general limiter to all API routes
app.use('/api/', apiLimiter);

// Apply strict limiter specifically to auth routes
app.use('/api/auth/', authLimiter);
```

### Implement Business Logic Validation

Beyond input sanitization, validate business rules at the application level. For financial operations, verify ownership, check balances, and prevent edge cases like negative amounts or self-transfers that could be exploited.

```javascript
// Example: Money transfer with comprehensive business logic validation
app.post('/transfer', authenticate, async (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body;

  // Validate amount is a positive number
  // Prevents negative transfers (which would be reverse transfers)
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  // Verify the user owns the source account
  // Prevents transferring from other users' accounts
  const fromAccount = await Account.findOne({
    _id: fromAccountId,
    userId: req.user.id, // Must belong to authenticated user
  });

  if (!fromAccount) {
    return res.status(404).json({ error: 'Source account not found' });
  }

  // Check sufficient balance before transfer
  // Prevents overdraft/negative balance exploitation
  if (fromAccount.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Prevent self-transfer (potential money laundering vector)
  if (fromAccountId === toAccountId) {
    return res.status(400).json({ error: 'Cannot transfer to same account' });
  }

  // Perform transfer atomically using database transaction
  // Ensures consistency even if request fails mid-operation
  await performTransfer(fromAccountId, toAccountId, amount);

  res.json({ success: true });
});
```

## A05: Security Misconfiguration

### Security Headers with Helmet

HTTP security headers protect against common web vulnerabilities like XSS, clickjacking, and MIME sniffing. The Helmet middleware sets sensible defaults and allows customization for your specific needs.

```javascript
const helmet = require('helmet');

// Helmet sets multiple security headers with sensible defaults
app.use(helmet({
  // Content Security Policy - controls which resources can be loaded
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],           // Only allow resources from same origin
      scriptSrc: ["'self'"],            // Only allow scripts from same origin
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (for CSS-in-JS)
      imgSrc: ["'self'", 'data:', 'https:'],   // Allow images from same origin, data URIs, and HTTPS
      connectSrc: ["'self'"],           // Only allow XHR/fetch to same origin
      fontSrc: ["'self'"],              // Only allow fonts from same origin
      objectSrc: ["'none'"],            // Block all plugins (Flash, Silverlight)
      frameSrc: ["'none'"],             // Block all iframes
    },
  },
  crossOriginEmbedderPolicy: true,      // Prevent loading cross-origin resources without CORS
  crossOriginOpenerPolicy: true,        // Isolate browsing context from popups
  crossOriginResourcePolicy: { policy: 'same-site' }, // Restrict resource loading
  dnsPrefetchControl: { allow: false }, // Disable DNS prefetching to prevent info leakage
  frameguard: { action: 'deny' },       // Prevent clickjacking by blocking iframe embedding
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // Force HTTPS for 1 year
  ieNoOpen: true,                       // Prevent IE from executing downloads in site context
  noSniff: true,                        // Prevent MIME-type sniffing
  originAgentCluster: true,             // Request separate process for this origin
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }, // Block Adobe Flash/PDF policies
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Control referrer header
  xssFilter: true,                      // Enable browser's XSS filter
}));
```

### Secure CORS Configuration

Cross-Origin Resource Sharing (CORS) controls which domains can access your API. Never use `origin: '*'` in production with credentials. Instead, explicitly whitelist allowed origins and validate them dynamically.

```javascript
const cors = require('cors');

const corsOptions = {
  // Dynamic origin validation using a callback function
  origin: (origin, callback) => {
    // Load allowed origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    // Allow requests with no origin (mobile apps, Postman, curl)
    // In strict environments, you may want to reject these
    if (!origin) return callback(null, true);

    // Check if the requesting origin is in our whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Reject requests from unknown origins
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'],   // Allowed request headers
  credentials: true,  // Allow cookies and auth headers (requires specific origin, not *)
  maxAge: 86400,      // Cache preflight response for 24 hours
};

app.use(cors(corsOptions));
```

### Disable Debug Information in Production

Stack traces, error details, and debug information can reveal implementation details to attackers. In production, return generic error messages while logging full details server-side for debugging.

```javascript
// Express error handler middleware (must have 4 parameters)
app.use((err, req, res, next) => {
  // Always log full error server-side for debugging
  console.error(err.stack);

  if (process.env.NODE_ENV === 'production') {
    // In production: return generic message, don't expose internals
    // Stack traces can reveal file paths, dependencies, and logic
    res.status(500).json({ error: 'Internal server error' });
  } else {
    // In development: show full error for debugging
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
});
```

## A06: Vulnerable and Outdated Components

### Automated Dependency Auditing

Regularly audit your dependencies for known vulnerabilities. Add npm scripts to make auditing part of your development workflow, and integrate them into your CI/CD pipeline to catch vulnerabilities before deployment.

```json
// package.json - Add these scripts for easy security checks
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "outdated": "npm outdated"
  }
}
```

### CI/CD Security Scanning

Automate security scanning in your CI/CD pipeline to catch vulnerabilities early. Run scans on every PR, and schedule daily scans to catch newly discovered vulnerabilities in existing dependencies.

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *' # Run daily at midnight to catch new CVEs

jobs:
  # Built-in npm audit - catches known vulnerabilities
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      # Fail build if high severity vulnerabilities are found
      - run: npm audit --audit-level=high

  # Snyk provides deeper scanning and license compliance
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

Implement JWTs with short-lived access tokens and longer-lived refresh tokens. Use the HS256 algorithm with a strong secret, and always validate token claims including type and expiration.

```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '15m';           // Short-lived access tokens
const REFRESH_TOKEN_EXPIRES_IN = '7d';  // Longer-lived refresh tokens

// Generate both access and refresh tokens for a user
function generateTokens(user) {
  // Access token - contains user identity and permissions
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roles: user.roles, // Include roles for authorization checks
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256', // Symmetric algorithm - use RS256 for distributed systems
    }
  );

  // Refresh token - only contains user ID and type marker
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' }, // Type field prevents token misuse
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

// Authentication middleware - validates JWT and attaches user to request
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  // Validate Bearer token format
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.slice(7);

  try {
    // Verify signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET);

    // Prevent refresh tokens from being used as access tokens
    if (decoded.type === 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Attach decoded payload to request for use in route handlers
    req.user = decoded;
    next();
  } catch (error) {
    // Provide specific error messages for different failure types
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Token Refresh with Rotation

Token rotation ensures that each refresh token can only be used once. When a refresh token is used, it is immediately revoked and a new one is issued. This limits the window for token theft attacks.

```javascript
// Store refresh tokens with revocation capability
// Use Redis in production for persistence and scalability
const refreshTokens = new Map();

app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    // Verify the refresh token signature and expiration
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // Ensure this is actually a refresh token, not an access token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if token has been revoked (already used or manually revoked)
    if (refreshTokens.get(refreshToken) === 'revoked') {
      return res.status(401).json({ error: 'Token revoked' });
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // IMPORTANT: Revoke the old refresh token immediately
    // This implements token rotation - each token can only be used once
    refreshTokens.set(refreshToken, 'revoked');

    // Generate new token pair (new access token + new refresh token)
    const tokens = generateTokens(user);

    res.json(tokens);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

## A08: Software and Data Integrity Failures

### Verify Package Integrity

Use `npm ci` instead of `npm install` in CI/CD environments. This command installs exact versions from `package-lock.json`, ensuring consistent and reproducible builds while also verifying package integrity through checksums.

```json
// package.json - Use lockfile for deterministic builds
{
  "scripts": {
    "install": "npm ci"
  }
}
```

### Subresource Integrity for CDN Resources

When loading scripts from CDNs, use Subresource Integrity (SRI) to ensure the file has not been tampered with. The browser will verify the hash before executing the script, protecting against CDN compromises.

```html
<!-- SRI ensures the script matches the expected hash -->
<!-- If the file is modified, the browser will refuse to execute it -->
<script
  src="https://cdn.example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

## A09: Security Logging and Monitoring Failures

### Comprehensive Security Logging

Log all security-relevant events including authentication attempts, access denials, and suspicious activities. Structured JSON logs enable easy searching and alerting. Always log IP addresses and user agents to help identify attackers.

```javascript
const winston = require('winston');

// Create a dedicated security logger with JSON format for easy parsing
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(), // Add timestamp to all log entries
    winston.format.json()       // JSON format for structured logging
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
  ],
});

// Helper function to log security events with consistent structure
function logAuthEvent(event, req, details = {}) {
  securityLogger.info({
    event,                        // Event type (LOGIN_FAILED, LOGIN_SUCCESS, etc.)
    ip: req.ip,                   // Client IP for identifying attackers
    userAgent: req.get('User-Agent'), // Browser/client identification
    userId: req.user?.id,         // User ID if authenticated
    path: req.path,               // Requested endpoint
    ...details,                   // Additional context
  });
}

// Login endpoint with security logging
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !await bcrypt.compare(password, user.password)) {
    // Log failed login attempts - useful for detecting brute force attacks
    logAuthEvent('LOGIN_FAILED', req, { email });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Log successful logins for audit trail
  logAuthEvent('LOGIN_SUCCESS', req, { userId: user.id });

  const tokens = generateTokens(user);
  res.json(tokens);
});

// Log access control violations (403 Forbidden responses)
app.use((err, req, res, next) => {
  if (err.status === 403) {
    // Log unauthorized access attempts for security monitoring
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

SSRF attacks trick your server into making requests to internal services or cloud metadata endpoints. Prevent this by validating URLs and resolving hostnames to check they don't point to internal network ranges.

```javascript
const { URL } = require('url');
const dns = require('dns').promises;

// Block private/internal IP ranges (RFC 1918 and others)
const BLOCKED_RANGES = [
  /^10\./,                           // 10.0.0.0/8 (Class A private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12 (Class B private)
  /^192\.168\./,                     // 192.168.0.0/16 (Class C private)
  /^127\./,                          // 127.0.0.0/8 (Loopback)
  /^0\./,                            // 0.0.0.0/8 (Current network)
  /^169\.254\./,                     // 169.254.0.0/16 (Link-local, AWS metadata!)
];

// Validate URL is safe to fetch (no internal network access)
async function isUrlSafe(urlString) {
  try {
    const url = new URL(urlString);

    // Only allow http/https protocols - block file://, ftp://, etc.
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    // Resolve hostname to IP address(es)
    // This catches DNS rebinding attacks where hostname resolves to internal IP
    const addresses = await dns.resolve4(url.hostname);

    // Check if any resolved IP is in blocked ranges
    for (const ip of addresses) {
      for (const range of BLOCKED_RANGES) {
        if (range.test(ip)) {
          // Log the attempt for security monitoring
          console.warn(`Blocked SSRF attempt to ${ip}`);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    // If URL parsing or DNS resolution fails, reject the request
    return false;
  }
}

// Endpoint that fetches external URLs - protected against SSRF
app.post('/fetch-url', async (req, res) => {
  const { url } = req.body;

  // Validate URL before making any request
  if (!await isUrlSafe(url)) {
    return res.status(400).json({ error: 'URL not allowed' });
  }

  // Safe to fetch - URL has been validated
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
