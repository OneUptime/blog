# How to Use Helmet for Security in Express.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Express, Security, Helmet, Web Development

Description: Secure your Express.js applications with Helmet middleware by setting HTTP security headers including CSP, HSTS, and protection against XSS and clickjacking.

---

Helmet is a collection of middleware functions that set HTTP security headers to protect your Express.js applications from common web vulnerabilities. With one line of code, you get protection against clickjacking, XSS, MIME sniffing, and more.

## Quick Start

Install and use Helmet with default settings:

```bash
npm install helmet
```

```javascript
const express = require('express');
const helmet = require('helmet');

const app = express();

// Use Helmet with defaults
app.use(helmet());

app.get('/', (req, res) => {
    res.send('Hello, secure world!');
});

app.listen(3000);
```

That single `app.use(helmet())` line sets 15 security headers. But the defaults are not always right for every application. Let us understand each header and configure them properly.

## What Helmet Sets by Default

| Header | Purpose |
|--------|---------|
| Content-Security-Policy | Prevents XSS by controlling resource loading |
| Cross-Origin-Opener-Policy | Isolates browsing context |
| Cross-Origin-Resource-Policy | Prevents other origins from reading resources |
| Origin-Agent-Cluster | Requests process isolation |
| Referrer-Policy | Controls Referer header |
| Strict-Transport-Security | Forces HTTPS |
| X-Content-Type-Options | Prevents MIME sniffing |
| X-DNS-Prefetch-Control | Controls DNS prefetching |
| X-Download-Options | IE specific download protection |
| X-Frame-Options | Prevents clickjacking |
| X-Permitted-Cross-Domain-Policies | Adobe product policy |
| X-Powered-By | Removes the header (hides Express) |
| X-XSS-Protection | Legacy XSS filter (disabled) |

## Content Security Policy (CSP)

CSP is the most powerful header but also the most complex. It tells browsers which resources (scripts, styles, images) are allowed to load:

```javascript
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                // Default fallback for all resource types
                defaultSrc: ["'self'"],

                // Scripts
                scriptSrc: [
                    "'self'",
                    "https://cdn.example.com",
                    "'unsafe-inline'"  // Avoid if possible
                ],

                // Styles
                styleSrc: [
                    "'self'",
                    "https://fonts.googleapis.com",
                    "'unsafe-inline'"
                ],

                // Images
                imgSrc: [
                    "'self'",
                    "data:",
                    "https://images.example.com"
                ],

                // Fonts
                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com"
                ],

                // AJAX, WebSocket, fetch
                connectSrc: [
                    "'self'",
                    "https://api.example.com",
                    "wss://socket.example.com"
                ],

                // Frames
                frameAncestors: ["'none'"],  // Prevents clickjacking

                // Forms
                formAction: ["'self'"],

                // Plugins (Flash, etc.)
                objectSrc: ["'none'"],

                // Base URL
                baseUri: ["'self'"]
            }
        }
    })
);
```

### Using Nonces for Inline Scripts

Instead of `'unsafe-inline'`, use nonces for better security:

```javascript
const crypto = require('crypto');

app.use((req, res, next) => {
    // Generate a unique nonce for each request
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                scriptSrc: [
                    "'self'",
                    (req, res) => `'nonce-${res.locals.nonce}'`
                ]
            }
        }
    })
);

// In your template
app.get('/', (req, res) => {
    res.send(`
        <html>
        <body>
            <script nonce="${res.locals.nonce}">
                console.log('This script is allowed');
            </script>
        </body>
        </html>
    `);
});
```

### Report-Only Mode for Testing

Test your CSP without breaking things:

```javascript
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                reportUri: '/csp-report'
            },
            reportOnly: true  // Just report, do not block
        }
    })
);

// Endpoint to receive CSP violation reports
app.post('/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
    console.log('CSP Violation:', req.body);
    res.status(204).end();
});
```

## Strict-Transport-Security (HSTS)

Forces browsers to use HTTPS:

```javascript
app.use(
    helmet({
        strictTransportSecurity: {
            maxAge: 31536000,        // 1 year in seconds
            includeSubDomains: true, // Apply to subdomains
            preload: true            // Allow HSTS preload list inclusion
        }
    })
);
```

Only enable this if your site fully supports HTTPS. Once a browser sees this header, it will refuse HTTP connections for the specified time.

## X-Frame-Options and frameAncestors

Prevent your site from being embedded in iframes (clickjacking protection):

```javascript
app.use(
    helmet({
        // Modern way - through CSP
        contentSecurityPolicy: {
            directives: {
                frameAncestors: ["'self'"]  // Only allow same origin
                // frameAncestors: ["'none'"]  // Block all framing
                // frameAncestors: ["https://trusted.com"]  // Specific domains
            }
        },
        // Legacy header (for older browsers)
        frameguard: {
            action: 'sameorigin'  // 'deny' or 'sameorigin'
        }
    })
);
```

## Cross-Origin Policies

Control how your resources interact with other origins:

```javascript
app.use(
    helmet({
        // How your page can be opened from other origins
        crossOriginOpenerPolicy: {
            policy: 'same-origin'  // 'same-origin', 'same-origin-allow-popups', 'unsafe-none'
        },

        // Who can embed your resources
        crossOriginResourcePolicy: {
            policy: 'same-origin'  // 'same-origin', 'same-site', 'cross-origin'
        },

        // Who can embed your page
        crossOriginEmbedderPolicy: {
            policy: 'require-corp'  // 'require-corp', 'credentialless', false
        }
    })
);
```

## Referrer Policy

Control what information is sent in the Referer header:

```javascript
app.use(
    helmet({
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin'
            // Options:
            // 'no-referrer' - Never send
            // 'same-origin' - Only for same origin
            // 'strict-origin' - Origin only, HTTPS to HTTPS
            // 'strict-origin-when-cross-origin' - Full URL for same origin, origin for cross-origin
        }
    })
);
```

## Disabling Specific Middleware

If a header breaks your application:

```javascript
app.use(
    helmet({
        // Disable specific middleware
        contentSecurityPolicy: false,  // Disable CSP entirely
        crossOriginEmbedderPolicy: false,  // Needed for some third-party embeds
    })
);
```

## Configuration for APIs

APIs need different settings than web pages:

```javascript
// For API servers
app.use(
    helmet({
        // APIs typically do not serve HTML, so CSP is less important
        contentSecurityPolicy: false,

        // Not relevant for APIs
        crossOriginEmbedderPolicy: false,

        // Keep these
        strictTransportSecurity: {
            maxAge: 31536000,
            includeSubDomains: true
        },

        // Hide Express
        hidePoweredBy: true
    })
);
```

## Complete Production Configuration

Here is a comprehensive setup for a production web application:

```javascript
const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();

// Generate nonce for each request
app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(32).toString('base64');
    next();
});

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    (req, res) => `'nonce-${res.locals.cspNonce}'`
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",  // Often needed for CSS-in-JS
                    "https://fonts.googleapis.com"
                ],
                imgSrc: ["'self'", "data:", "https:"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                connectSrc: ["'self'", process.env.API_URL],
                frameAncestors: ["'none'"],
                formAction: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                upgradeInsecureRequests: []
            }
        },
        strictTransportSecurity: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin'
        },
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'same-origin' }
    })
);

// Your routes
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <script nonce="${res.locals.cspNonce}">
                console.log('Secure page loaded');
            </script>
        </head>
        <body>
            <h1>Secure Application</h1>
        </body>
        </html>
    `);
});

app.listen(3000);
```

## Testing Your Headers

Check your headers with curl:

```bash
curl -I https://yoursite.com
```

Or use online tools:
- securityheaders.com
- observatory.mozilla.org

## Summary

Helmet provides essential security headers with minimal configuration. Start with the defaults, then customize based on your application needs. Pay special attention to Content-Security-Policy since it is the most powerful protection against XSS but also the most likely to break functionality if misconfigured. Always test in report-only mode before enforcing CSP rules in production.
