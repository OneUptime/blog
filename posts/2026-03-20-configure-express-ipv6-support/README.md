# How to Configure Express.js for IPv6 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Express.js, Node.js, IPv6, Web Framework, Trust Proxy, Dual-Stack

Description: Configure Express.js to listen on IPv6, extract real client IPv6 addresses with trust proxy settings, and handle IPv6 addresses in middleware.

## Introduction

Node.js and Express.js support IPv6 natively. You can bind explicitly to `::` (or omit the host and let Node.js use the unspecified IPv6 address when IPv6 is available), then configure `trust proxy` to correctly extract client IPv6 addresses when behind a load balancer or reverse proxy.

## Step 1: Listen on IPv6

```javascript
// server.js
const express = require('express');
const app = express();

// Listen on all IPv6 interfaces (often dual-stack, depending on OS)
app.listen(3000, '::', () => {
    console.log('Server listening on [::]:3000');
});
```

```javascript
// With explicit host options
const http = require('http');
const server = http.createServer(app);

server.listen({
    host: '::',
    port: 3000,
    ipv6Only: false,  // Leave dual-stack enabled
}, () => {
    console.log('Listening on IPv6 (dual-stack when supported)');
});
```

```javascript
// IPv6-only (no IPv4)
server.listen({
    host: '::',
    port: 3000,
    ipv6Only: true,  // Only accept IPv6 connections
});
```

## Step 2: Trust Proxy for IPv6

```javascript
// app.js

// Trust one proxy level (for NGINX/load balancer)
app.set('trust proxy', 1);

// Or trust specific IPv6 proxy
app.set('trust proxy', '2001:db8::1');

// Trust loopback (::1) proxy
app.set('trust proxy', 'loopback');

// Trust multiple proxies
app.set('trust proxy', ['loopback', '2001:db8::/32']);
```

## Step 3: Get Client IPv6 Address

```javascript
// middleware/clientIP.js
const net = require('net');

function getClientIP(req) {
    // With trust proxy configured, req.ip is the real client IP
    let ip = req.ip;

    // Remove IPv4-mapped IPv6 prefix
    if (ip && ip.startsWith('::ffff:')) {
        ip = ip.slice(7);
    }

    return ip;
}

app.use((req, res, next) => {
    req.clientIP = getClientIP(req);
    req.isIPv6 = net.isIPv6(req.clientIP);
    next();
});
```

## Step 4: IPv6 Rate Limiting by /64 Subnet

```javascript
// middleware/rateLimit.js
const { RateLimiterMemory } = require('rate-limiter-flexible');
const ipaddr = require('ipaddr.js');

const rateLimiter = new RateLimiterMemory({
    points: 100,     // requests
    duration: 60,    // per minute
});

function getRateLimitKey(ip) {
    try {
        const addr = ipaddr.process(ip);

        if (addr.kind() === 'ipv6') {
            // Rate limit by /64 subnet
            const prefix = addr.toNormalizedString().split(':').slice(0, 4).join(':');
            return `${prefix}::/64`;
        }

        return addr.toString();
    } catch {
        return ip;
    }
}

app.use(async (req, res, next) => {
    const key = getRateLimitKey(req.clientIP);
    try {
        await rateLimiter.consume(key);
        next();
    } catch {
        res.status(429).json({ error: 'Too Many Requests' });
    }
});
```

## Step 5: Log IPv6 Client Addresses

```javascript
// Using morgan with IPv6
const morgan = require('morgan');

// Custom format that shows the real client IP
morgan.token('real-ip', (req) => req.clientIP || req.ip);

app.use(morgan(':real-ip :method :url :status :response-time ms'));
```

## Step 6: Test

```bash
# Start the server

node server.js

# Test from IPv6 (`::1` locally, or replace it with your server's real IPv6 address)
curl -6 http://[::1]:3000/

# Check headers
curl -6 -I http://[::1]:3000/

# Test IPv6 address extraction
curl -6 -H "X-Forwarded-For: 2001:db8::cafe" http://[::1]:3000/
```

## Conclusion

Express.js can bind explicitly to `'::'` for IPv6, or let Node.js choose `::` when the host is omitted and IPv6 is available. Set `trust proxy` to the appropriate level or specific IPv6 proxy addresses so `req.ip` returns the real client address. Strip `::ffff:` IPv4-mapped prefixes and rate-limit by /64 subnets for fair treatment of IPv6 clients. Monitor Express.js endpoints with OneUptime's IPv6 HTTP checks.
