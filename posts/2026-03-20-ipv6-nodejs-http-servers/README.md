# How to Create IPv6 HTTP Servers in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, IPv6, HTTP, Networking, Dual-Stack

Description: Create IPv6 HTTP servers in Node.js using the built-in http module, extract client IPv6 addresses, and handle dual-stack connections.

## Basic IPv6 HTTP Server

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
    const clientIP = req.socket.remoteAddress;
    const method = req.method;
    const url = req.url;

    console.log(`[${clientIP}] ${method} ${url}`);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Hello from IPv6 Node.js! Your IP: ${clientIP}\n`);
});

// '::' listens on all IPv6 interfaces and may also accept IPv4 on most OSes
server.listen(8080, '::', () => {
    const addr = server.address();
    console.log(`Server on [${addr.address}]:${addr.port}`);
});
```

## Extracting Real Client IPv6 Address

When behind a trusted proxy, use the forwarding header it sets, commonly `X-Forwarded-For`. Handle IPv4-mapped addresses (`::ffff:x.x.x.x`) from dual-stack listeners:

```javascript
const http = require('http');
const net = require('net');

function normalizeIP(addr = '') {
    // Unwrap IPv4-mapped IPv6: ::ffff:192.168.1.1 -> 192.168.1.1
    return addr.startsWith('::ffff:') ? addr.slice(7) : addr;
}

function getClientIP(req) {
    // Only trust proxy headers added by a reverse proxy you control.
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return normalizeIP(forwarded.split(',')[0].trim());
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) return normalizeIP(realIP);

    return normalizeIP(req.socket.remoteAddress || '');
}

const server = http.createServer((req, res) => {
    const ip = getClientIP(req);
    const version = net.isIPv6(ip) ? 'IPv6' : net.isIPv4(ip) ? 'IPv4' : 'unknown';

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        ip,
        version,
        path: req.url,
    }));
});

server.listen(8080, '::', () => {
    console.log('Listening on [::]:8080');
});
```

## HTTPS over IPv6

```javascript
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
};

const server = https.createServer(options, (req, res) => {
    res.writeHead(200);
    res.end('HTTPS over IPv6!\n');
});

server.listen(443, '::', () => {
    console.log('HTTPS server on [::]:443');
});
```

## IPv6-Specific vs Dual-Stack

```javascript
const http = require('http');

function createServer(port, ipv6Only) {
    const server = http.createServer((req, res) => {
        res.end(`Listening on [::]:${port} (ipv6Only=${ipv6Only})\n`);
    });

    server.listen({ port, host: '::', ipv6Only }, () => {
        console.log(`Server on [::]:${port}`);
        console.log(`ipv6Only: ${ipv6Only}`);
    });

    return server;
}

// IPv6-only on all interfaces
createServer(8081, true);

// Dual-stack on most operating systems
createServer(8082, false);
```

## Middleware for IPv6 Rate Limiting

```javascript
const http = require('http');
const net = require('net');

const rateLimits = new Map();
const LIMIT = 100;  // requests per minute
const WINDOW_MS = 60_000;

function normalizeIP(addr = '') {
    return addr.startsWith('::ffff:') ? addr.slice(7) : addr;
}

function ipv4TailToHextets(ipv4) {
    const octets = ipv4.split('.').map(Number);
    if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
        return null;
    }

    return [
        ((octets[0] << 8) | octets[1]).toString(16),
        ((octets[2] << 8) | octets[3]).toString(16),
    ];
}

function expandIPv6(ip) {
    if (!net.isIPv6(ip)) {
        return null;
    }

    let normalized = ip.toLowerCase();
    const ipv4TailMatch = normalized.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);

    if (ipv4TailMatch) {
        const hextets = ipv4TailToHextets(ipv4TailMatch[2]);
        if (!hextets) {
            return null;
        }

        normalized = `${ipv4TailMatch[1]}${hextets[0]}:${hextets[1]}`;
    }

    const halves = normalized.split('::');
    if (halves.length > 2) {
        return null;
    }

    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const missing = 8 - (left.length + right.length);

    if ((halves.length === 1 && left.length !== 8) || missing < 0) {
        return null;
    }

    const parts = halves.length === 2
        ? [...left, ...Array(missing).fill('0'), ...right]
        : left;

    return parts.map((part) => part.padStart(4, '0'));
}

function getRateKey(ip) {
    // Group IPv6 addresses by /64 prefix for rate limiting
    const expanded = expandIPv6(ip);
    if (expanded) {
        return `${expanded.slice(0, 4).join(':')}::/64`;
    }

    return ip;
}

function checkRateLimit(ip) {
    const key = getRateKey(ip);
    const now = Date.now();
    const record = rateLimits.get(key) || { count: 0, reset: now + WINDOW_MS };

    if (now > record.reset) {
        record.count = 0;
        record.reset = now + WINDOW_MS;
    }

    record.count++;
    rateLimits.set(key, record);

    return record.count <= LIMIT;
}

const server = http.createServer((req, res) => {
    const realIP = normalizeIP(req.socket.remoteAddress || '');

    if (!checkRateLimit(realIP)) {
        res.writeHead(429, { 'Retry-After': '60' });
        res.end('Rate limit exceeded\n');
        return;
    }

    res.writeHead(200);
    res.end('OK\n');
});

server.listen(8080, '::', () => console.log('Rate-limited server on [::]:8080'));
```

## Conclusion

Node.js HTTP servers support IPv6 by passing `'::'` as the hostname to `listen()`. Use the `ipv6Only` option when you want IPv6-only behavior; otherwise, binding to `'::'` may also accept IPv4 on most operating systems. The `req.socket.remoteAddress` property contains the client's IP, with IPv4 connections often appearing as `::ffff:x.x.x.x` on dual-stack listeners. Strip the `::ffff:` prefix to recover the IPv4 address. For production deployments behind Nginx or a load balancer, only trust `X-Forwarded-For` or `X-Real-IP` headers added by a reverse proxy you control. Grouping IPv6 clients by `/64` is a common rate-limiting heuristic because a single client or network may use multiple addresses inside the same prefix.
