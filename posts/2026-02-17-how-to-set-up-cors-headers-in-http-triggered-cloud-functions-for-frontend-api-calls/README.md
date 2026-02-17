# How to Set Up CORS Headers in HTTP-Triggered Cloud Functions for Frontend API Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, CORS, HTTP, Frontend

Description: How to properly configure CORS headers in Google Cloud Functions so your frontend applications can make cross-origin API calls without browser errors.

---

You have deployed your Cloud Function as an API endpoint, your frontend makes a fetch request to it, and you get the dreaded CORS error in your browser console. This is one of the most common issues developers face when building frontends that call Cloud Functions directly. The browser is blocking the request because the function is not sending the right CORS headers.

Let me show you how to handle CORS properly in Cloud Functions, covering both the simple and complex cases.

## What is CORS and Why Does It Matter?

CORS (Cross-Origin Resource Sharing) is a browser security mechanism. When your frontend at `https://app.example.com` makes a request to your Cloud Function at `https://us-central1-my-project.cloudfunctions.net/api`, the browser considers this a cross-origin request because the domains are different.

Before sending the actual request, the browser might send a preflight OPTIONS request to check whether the server allows cross-origin access. If the server does not respond with the right headers, the browser blocks the actual request entirely.

The key headers involved are:

- `Access-Control-Allow-Origin` - Which origins can make requests
- `Access-Control-Allow-Methods` - Which HTTP methods are allowed
- `Access-Control-Allow-Headers` - Which request headers are allowed
- `Access-Control-Max-Age` - How long to cache the preflight response

## Basic CORS Setup

Here is the simplest approach that works for most cases:

```javascript
// index.js - Cloud Function with basic CORS handling
const functions = require('@google-cloud/functions-framework');

functions.http('api', (req, res) => {
  // Set CORS headers for every response
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests and return immediately
    res.status(204).send('');
    return;
  }

  // Your actual function logic
  res.json({ message: 'Hello from the API!' });
});
```

The `Access-Control-Allow-Origin: *` wildcard allows requests from any origin. This is fine for public APIs but not great for private ones.

## Restricting to Specific Origins

For production, you should restrict CORS to only the origins that should be calling your API:

```javascript
// index.js - Cloud Function with origin-restricted CORS
const functions = require('@google-cloud/functions-framework');

// Define allowed origins
const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'https://admin.example.com',
  'https://staging.example.com'
]);

// In development, also allow localhost
if (process.env.APP_ENV !== 'production') {
  ALLOWED_ORIGINS.add('http://localhost:3000');
  ALLOWED_ORIGINS.add('http://localhost:5173');
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  // Only set the Allow-Origin header if the request comes from an allowed origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin'); // Important when origin is not a wildcard
  }

  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Max-Age', '3600');
}

functions.http('api', (req, res) => {
  setCorsHeaders(req, res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Route handling
  if (req.method === 'GET' && req.path === '/users') {
    res.json({ users: [] });
  } else if (req.method === 'POST' && req.path === '/users') {
    res.json({ created: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});
```

Notice the `Vary: Origin` header. This is important when you dynamically set `Access-Control-Allow-Origin` based on the request origin. It tells caches (including the browser cache and CDNs) that the response varies depending on the Origin header.

## Pattern-Based Origin Matching

If you have many subdomains or want to allow all subdomains of a domain:

```javascript
// Allow all subdomains of example.com
function isAllowedOrigin(origin) {
  if (!origin) return false;

  // Exact matches
  const exactMatches = [
    'https://example.com',
    'https://www.example.com'
  ];
  if (exactMatches.includes(origin)) return true;

  // Subdomain pattern matching
  const allowedPatterns = [
    /^https:\/\/[\w-]+\.example\.com$/,  // Any subdomain of example.com
    /^https:\/\/[\w-]+\.preview\.example\.com$/  // Preview deployments
  ];

  return allowedPatterns.some(pattern => pattern.test(origin));
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Credentials', 'true');
  }

  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
}
```

## Handling Credentials (Cookies and Auth Headers)

If your frontend sends cookies or Authorization headers, you need `Access-Control-Allow-Credentials: true` and you CANNOT use the wildcard `*` for `Access-Control-Allow-Origin`. You must specify the exact origin:

```javascript
// CORS with credentials support
functions.http('authenticatedApi', (req, res) => {
  const origin = req.headers.origin;

  // When using credentials, you must specify the exact origin
  if (ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }

  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.set('Access-Control-Expose-Headers', 'Set-Cookie');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Verify the Authorization header or cookie
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Missing authorization' });
    return;
  }

  // Process the authenticated request
  res.json({ authenticated: true });
});
```

On the frontend side, make sure to include credentials in the fetch call:

```javascript
// Frontend code - include credentials in fetch
const response = await fetch('https://us-central1-my-project.cloudfunctions.net/api/users', {
  method: 'GET',
  credentials: 'include', // This sends cookies
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Using the cors npm Package

If you do not want to manage CORS headers manually, the `cors` npm package handles it cleanly:

```javascript
// Using the cors package for cleaner CORS handling
const functions = require('@google-cloud/functions-framework');
const cors = require('cors');

// Configure CORS middleware
const corsMiddleware = cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 3600
});

functions.http('api', (req, res) => {
  // Wrap the handler with the cors middleware
  corsMiddleware(req, res, () => {
    // This code runs after CORS headers are set
    // OPTIONS requests are handled automatically by the middleware

    if (req.method === 'GET') {
      res.json({ data: 'Hello!' });
    } else if (req.method === 'POST') {
      res.json({ received: req.body });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  });
});
```

## Python CORS Handling

For Python Cloud Functions:

```python
# main.py - CORS handling in Python Cloud Functions
import functions_framework
import json

ALLOWED_ORIGINS = {
    'https://app.example.com',
    'https://admin.example.com',
}

def set_cors_headers(request, response_headers):
    """Set CORS headers based on the request origin."""
    origin = request.headers.get('Origin', '')

    if origin in ALLOWED_ORIGINS:
        response_headers['Access-Control-Allow-Origin'] = origin
        response_headers['Access-Control-Allow-Credentials'] = 'true'

    response_headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response_headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response_headers['Access-Control-Max-Age'] = '3600'

@functions_framework.http
def api(request):
    # Build response headers
    headers = {}
    set_cors_headers(request, headers)

    # Handle preflight
    if request.method == 'OPTIONS':
        return ('', 204, headers)

    # Actual request handling
    data = {'message': 'Hello from Python!'}
    return (json.dumps(data), 200, {**headers, 'Content-Type': 'application/json'})
```

## Debugging CORS Issues

When CORS is not working, check these things:

1. Open browser DevTools and look at the Network tab. Find the preflight OPTIONS request and check its response headers.

2. Make sure your function handles OPTIONS requests separately and returns a 204 with the CORS headers.

3. If using credentials, verify you are NOT using the wildcard `*` for Allow-Origin.

4. Check that the preflight response includes all the headers your request sends in `Access-Control-Allow-Headers`.

```bash
# Test CORS preflight manually with curl
curl -v -X OPTIONS \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  https://us-central1-my-project.cloudfunctions.net/api
```

Look at the response headers to make sure they include the right CORS headers.

## Monitoring CORS Errors

CORS failures happen silently on the server side since the browser blocks the response before your code sees the error. Use OneUptime to monitor your frontend for CORS-related JavaScript errors. When users report that features are broken, CORS misconfiguration is often the culprit, especially after deploying changes that modify the allowed origins list.

Get CORS right once, and you will not have to think about it again. Get it wrong, and you will spend hours wondering why perfectly good API endpoints are unreachable from your frontend.
