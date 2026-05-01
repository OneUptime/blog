# How to Configure Express.js Trust Proxy for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Express.js, Node.js, IPv6, Trust Proxy, X-Forwarded-For, Security, Middleware

Description: Configure Express.js trust proxy settings to correctly extract real client IPv6 addresses from X-Forwarded-For headers when behind IPv6-capable load balancers and reverse proxies.

## Introduction

When Express.js runs behind a reverse proxy, the client IP in `req.ip` is the proxy's IP unless trust proxy is configured. For IPv6 environments, this means correctly trusting IPv6 proxy addresses and parsing IPv6 addresses from `X-Forwarded-For` headers.

## How X-Forwarded-For Works with IPv6

```text
Client 2001:db8::cafe:1
    → IPv6 Load Balancer (2001:db8::b10)
    → NGINX Proxy (::1)
    → Express.js

X-Forwarded-For: 2001:db8::cafe:1, 2001:db8::b10
```

## Step 1: Trust Proxy Settings

```javascript
const express = require('express');
const app = express();

// Option 1: Trust 1 hop when Express is directly behind a single proxy
app.set('trust proxy', 1);
// Use this only when exactly one trusted proxy sits in front of Express.

// Option 2: Trust a specific IPv6 address
app.set('trust proxy', '::1');
// Express trusts ::1 as a proxy

// Option 3: Trust multiple IPv6 addresses/subnets
app.set('trust proxy', ['::1', '2001:db8::/32', 'loopback']);

// Option 4: Trust a count of hops (for example, load balancer + NGINX)
app.set('trust proxy', 2);  // Trust 2 proxy hops

// Option 5: Trust all (dangerous - do not use with public internet)
// app.set('trust proxy', true);
```

## Step 2: Extract Real IPv6 Address

```javascript
// middleware/realIP.js
const { isIPv4, isIPv6 } = require('net');

function normalizeIPv6(ip) {
    if (!ip) return null;

    // Remove IPv6 brackets [::1] → ::1
    ip = ip.replace(/^\[/, '').replace(/\]$/, '');

    // Remove IPv4-mapped IPv6 prefix ::ffff:1.2.3.4 → 1.2.3.4
    if (ip.startsWith('::ffff:')) {
        const v4 = ip.slice(7);
        if (isIPv4(v4)) return v4;
    }

    return ip;
}

function realIPMiddleware(req, res, next) {
    // With trust proxy configured correctly, req.ip is already the client IP.
    // Fall back to the socket address if req.ip is unavailable.
    const ip = req.ip || req.socket.remoteAddress;

    req.realIP = normalizeIPv6(ip);
    req.isIPv6 = req.realIP ? isIPv6(req.realIP) : false;
    next();
}

module.exports = realIPMiddleware;
```

## Step 3: Validate Trust Proxy Configuration

```javascript
// test-trust-proxy.js
const express = require('express');
const app = express();

// Configure trust proxy
app.set('trust proxy', ['::1', 'loopback']);

app.get('/debug-ip', (req, res) => {
    res.json({
        // With trust proxy configured correctly, req.ip is the client IP
        'req.ip':                  req.ip,
        'req.ips':                 req.ips,  // X-Forwarded-For chain
        'x-forwarded-for':         req.headers['x-forwarded-for'],
        'socket.remoteAddress':    req.socket.remoteAddress,
    });
});

app.listen(3000, '::');
```

```bash
# Test - simulate a request from IPv6 client via proxy

curl -6 http://[::1]:3000/debug-ip \
    -H "X-Forwarded-For: 2001:db8::cafe"
# Expected: req.ip = "2001:db8::cafe"

# Without the header (proxy IP shows)
curl -6 http://[::1]:3000/debug-ip
# Expected: req.ip = "::1"
```

## Step 4: Security Considerations

```javascript
// Security: never trust X-Forwarded-For from untrusted sources

// BAD: Always trusts XFF header, allows IP spoofing
app.set('trust proxy', true);

// GOOD: Trust only your known IPv6 proxy
app.set('trust proxy', '2001:db8::feed');

// GOOD: Trust only loopback (NGINX on same host)
app.set('trust proxy', 'loopback');

// Rate limiting using real IP (must be after trust proxy config)
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    // req.ip is correct after trust proxy
    // Apply IPv6 rate limiting to a /64 subnet.
    ipv6Subnet: 64,
});
app.use('/api/', limiter);
```

## Step 5: NGINX Configuration to Forward IPv6

```nginx
server {
    listen [::]:80;

    location / {
        proxy_pass http://[::1]:3000;

        # Forward the X-Forwarded-For chain, appending the immediate client IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
    }
}
```

## Conclusion

Express.js trust proxy for IPv6 requires listing your trusted IPv6 proxy addresses or setting the correct hop count, such as `app.set('trust proxy', ['::1', '2001:db8::/32'])`. Once configured correctly, `req.ip` returns the client IPv6 address after Express evaluates the trusted proxy chain in `X-Forwarded-For`. Never use `trust proxy: true` on public servers - restrict to known proxy addresses to prevent IP spoofing. Monitor Express.js with OneUptime to verify correct IP extraction in logs.
