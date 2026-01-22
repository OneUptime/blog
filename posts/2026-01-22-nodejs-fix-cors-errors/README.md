# How to Fix CORS Errors in Node.js Express

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, CORS, Security, API, Web Development

Description: Learn how to diagnose and fix CORS errors in Node.js Express applications, including proper configuration, common pitfalls, and security best practices for cross-origin requests.

---

CORS (Cross-Origin Resource Sharing) errors are among the most common issues developers face when building APIs. These errors appear when a web browser blocks requests from one origin (domain, protocol, or port) to another. Understanding how CORS works and how to configure it properly is essential for building web applications.

## Understanding CORS Errors

When you see this error in your browser console:

```
Access to XMLHttpRequest at 'http://api.example.com/data' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

It means the browser is protecting users by blocking a cross-origin request because the server did not explicitly allow it.

### Why CORS Exists

CORS is a security feature that prevents malicious websites from making requests to your API on behalf of unsuspecting users. Without it, any website could make authenticated requests to your banking API using your saved cookies.

```
Same Origin (allowed by default):
http://example.com/page1 -> http://example.com/api  ✓

Cross Origin (requires CORS):
http://localhost:3000 -> http://api.example.com     ✗ (blocked without CORS headers)
https://app.com -> http://api.com                    ✗ (different protocol)
http://app.com:3000 -> http://app.com:8080           ✗ (different port)
```

## Quick Fix: Using the cors Package

The fastest way to enable CORS in Express is using the `cors` middleware:

```bash
npm install cors
```

### Allow All Origins (Development Only)

This configuration allows any origin to access your API. Use this only during development.

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all origins - NOT for production!
app.use(cors());

app.get('/api/data', (req, res) => {
  res.json({ message: 'This is accessible from any origin' });
});

app.listen(3000);
```

### Allow Specific Origins (Production)

For production, always specify which origins can access your API:

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Configure CORS with specific options
const corsOptions = {
  // Allow only these origins
  origin: [
    'https://myapp.com',
    'https://admin.myapp.com',
    'https://staging.myapp.com',
  ],
  // Allow these HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  // Allow these headers in requests
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  // Expose these headers to the browser
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  // Cache preflight requests for 24 hours
  maxAge: 86400,
};

app.use(cors(corsOptions));
```

### Dynamic Origin Validation

When you need to validate origins dynamically (from a database or based on patterns):

```javascript
const cors = require('cors');

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check against allowed patterns
    const allowedPatterns = [
      /^https:\/\/.*\.myapp\.com$/,  // Any subdomain of myapp.com
      /^https:\/\/myapp\.com$/,       // Main domain
      /^http:\/\/localhost:\d+$/,     // Any localhost port (dev)
    ];
    
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
```

## Manual CORS Implementation

Understanding how to implement CORS manually helps you debug issues and handle complex scenarios.

### Basic Manual Implementation

```javascript
const express = require('express');
const app = express();

// CORS middleware
app.use((req, res, next) => {
  // Set the allowed origin
  const allowedOrigins = ['https://myapp.com', 'https://admin.myapp.com'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  // Allow credentials
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Allow specific methods
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Allow specific headers
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  
  next();
});
```

### Handling Preflight Requests

Browsers send a preflight OPTIONS request before "non-simple" requests. This includes requests with:
- Methods other than GET, HEAD, or POST
- Headers other than Accept, Accept-Language, Content-Language, or Content-Type
- Content-Type other than application/x-www-form-urlencoded, multipart/form-data, or text/plain

```javascript
// Handle preflight for all routes
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// Or handle preflight for specific routes
app.options('/api/users', cors(corsOptions));
app.options('/api/orders', cors(corsOptions));
```

## Common CORS Issues and Solutions

### Issue 1: Credentials Not Working

When using cookies or Authorization headers, you must configure both client and server correctly.

**Server configuration:**

```javascript
const corsOptions = {
  origin: 'https://myapp.com', // Must be specific origin, not '*'
  credentials: true,
};

app.use(cors(corsOptions));
```

**Client (fetch) configuration:**

```javascript
// The browser will only send cookies if credentials is 'include'
fetch('https://api.myapp.com/data', {
  method: 'GET',
  credentials: 'include', // Include cookies in cross-origin requests
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Important:** When `credentials: true`, you cannot use `Access-Control-Allow-Origin: *`. You must specify the exact origin.

### Issue 2: Custom Headers Not Allowed

If your API uses custom headers, you must explicitly allow them:

```javascript
const corsOptions = {
  origin: 'https://myapp.com',
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Custom-Header',
  ],
};
```

### Issue 3: Response Headers Not Accessible

By default, browsers only expose these response headers to JavaScript:
- Cache-Control
- Content-Language
- Content-Type
- Expires
- Last-Modified
- Pragma

To access custom headers in your frontend code:

```javascript
const corsOptions = {
  origin: 'https://myapp.com',
  exposedHeaders: [
    'X-Total-Count',     // Pagination total
    'X-Page-Count',      // Pagination pages
    'X-RateLimit-Limit', // Rate limit info
    'X-RateLimit-Remaining',
  ],
};
```

### Issue 4: CORS Error Only in Production

This usually happens because localhost works without CORS (same-origin) but production involves different domains.

```javascript
const corsOptions = {
  origin: function(origin, callback) {
    // In development, allow no origin (same-origin requests)
    if (process.env.NODE_ENV === 'development' && !origin) {
      return callback(null, true);
    }
    
    // In production, check against allowed list
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};
```

### Issue 5: CORS Error After Error Response

If your error handling middleware does not set CORS headers, error responses will fail CORS:

```javascript
// Make sure CORS middleware runs BEFORE routes
app.use(cors(corsOptions));

// Then routes
app.use('/api', apiRoutes);

// Then error handling - must also have CORS headers
app.use((err, req, res, next) => {
  // CORS headers are already set by middleware above
  // because it runs before this error handler
  
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message,
  });
});
```

## Route-Specific CORS Configuration

Sometimes you need different CORS settings for different routes:

```javascript
const cors = require('cors');

// Public API - allow all origins
const publicCors = cors({
  origin: '*',
  methods: ['GET'],
});

// Authenticated API - specific origins only
const privateCors = cors({
  origin: ['https://myapp.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

// Webhook endpoint - specific IP/domain
const webhookCors = cors({
  origin: ['https://webhook.provider.com'],
  methods: ['POST'],
});

// Apply different CORS to different routes
app.use('/api/public', publicCors, publicRoutes);
app.use('/api/v1', privateCors, privateRoutes);
app.use('/webhooks', webhookCors, webhookRoutes);
```

## Debugging CORS Issues

### Check the Network Tab

In browser DevTools, look at the request/response headers:

**Request headers to check:**
- `Origin` - The origin making the request

**Response headers to check:**
- `Access-Control-Allow-Origin` - Should match the Origin or be *
- `Access-Control-Allow-Methods` - Should include the method used
- `Access-Control-Allow-Headers` - Should include headers sent
- `Access-Control-Allow-Credentials` - Should be true if using cookies

### Log CORS Details

Add logging to understand what is happening:

```javascript
app.use((req, res, next) => {
  console.log('CORS Debug:', {
    origin: req.headers.origin,
    method: req.method,
    path: req.path,
    headers: Object.keys(req.headers),
  });
  next();
});
```

### Test with curl

curl does not enforce CORS (only browsers do), so use it to verify your API works:

```bash
# Test with Origin header
curl -i -H "Origin: https://myapp.com" http://localhost:3000/api/data

# Test preflight
curl -i -X OPTIONS \
  -H "Origin: https://myapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:3000/api/data
```

## Security Best Practices

### Never Use Wildcard with Credentials

This configuration is insecure and browsers will reject it:

```javascript
// BAD - browsers will block this
const corsOptions = {
  origin: '*',
  credentials: true, // Cannot use * with credentials
};
```

### Validate Origins Strictly

```javascript
const corsOptions = {
  origin: function(origin, callback) {
    // Validate against exact origins, not patterns that could be bypassed
    const allowedOrigins = new Set([
      'https://myapp.com',
      'https://www.myapp.com',
    ]);
    
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      // Log blocked attempts for security monitoring
      console.warn(`Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed'));
    }
  },
};
```

### Use Environment Variables

```javascript
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];

const corsOptions = {
  origin: allowedOrigins,
  credentials: process.env.CORS_CREDENTIALS === 'true',
};
```

## Summary

| Scenario | Configuration |
|----------|---------------|
| **Development** | `cors()` with no options (allow all) |
| **Production API** | Specific origins, credentials if needed |
| **Public API** | `origin: '*'`, no credentials |
| **Webhook endpoint** | Specific provider origins |
| **Multiple environments** | Dynamic origin validation |

CORS errors are your browser protecting users. Configure CORS thoughtfully by allowing only the origins that need access, and always test your configuration in conditions that match production.
