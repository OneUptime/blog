# How to Get the Client IPv4 Address from HTTP Requests in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Express, IPv4, Networking, HTTP, REST API

Description: Learn how to reliably extract the real client IPv4 address from HTTP requests in Node.js and Express, handling direct connections, reverse proxies, and X-Forwarded-For headers correctly.

## Express: Direct Connection

```javascript
const express = require("express");
const app = express();

app.get("/whoami", (req, res) => {
    // req.socket.remoteAddress - works for direct connections
    // May return "::ffff:192.168.1.1" for IPv4-mapped IPv6
    const raw = req.socket.remoteAddress || "";
    const ip  = raw.startsWith("::ffff:") ? raw.slice(7) : raw;
    res.json({ client_ip: ip });
});

app.listen(3000);
```

## Express: Behind a Reverse Proxy

```javascript
const express = require("express");
const app = express();

// Trust exactly one proxy hop in front of this app.
// req.ip is then derived from X-Forwarded-For using Express's trust proxy rules.
app.set("trust proxy", 1);

app.get("/whoami", (req, res) => {
    const raw = req.ip || "";
    const ip  = raw.startsWith("::ffff:") ? raw.slice(7) : raw;
    res.json({ client_ip: ip });
});

app.listen(3000);
```

## Express: Manual Header Parsing with Trust Check

```javascript
function normalizeIP(ip = "") {
    return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

function isTrustedProxy(ip) {
    const normalized = normalizeIP(ip);
    // Replace these with the actual proxy IPs/subnets you trust.
    // For complex proxy chains, prefer Express's trust proxy setting or a CIDR-aware library.
    return normalized === "127.0.0.1" ||
        normalized === "::1" ||
        normalized.startsWith("10.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized) ||
        normalized.startsWith("192.168.");
}

function getClientIP(req) {
    const remoteAddr = req.socket.remoteAddress || "";
    const xff = req.headers["x-forwarded-for"];
    if (xff && isTrustedProxy(remoteAddr)) {
        return normalizeIP(xff.split(",")[0].trim());
    }
    return normalizeIP(remoteAddr);
}

const express = require("express");
const app = express();
app.get("/whoami", (req, res) => {
    res.json({ client_ip: getClientIP(req) });
});
app.listen(3000);
```

## raw http Module

```javascript
const http = require("http");

function normalizeIP(ip = "") {
    return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

function isTrustedProxy(ip) {
    const normalized = normalizeIP(ip);
    // Replace these with the actual proxy IPs/subnets you trust.
    return normalized === "127.0.0.1" ||
        normalized === "::1" ||
        normalized.startsWith("10.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized) ||
        normalized.startsWith("192.168.");
}

const server = http.createServer((req, res) => {
    const remoteAddr = req.socket.remoteAddress || "";
    const xff = req.headers["x-forwarded-for"];
    const clientIP = xff && isTrustedProxy(remoteAddr)
        ? normalizeIP(xff.split(",")[0].trim())
        : normalizeIP(remoteAddr);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ client_ip: clientIP }));
});

server.listen(3000, "0.0.0.0");
```

## Logging Middleware

```javascript
const express = require("express");
const app = express();
app.set("trust proxy", 1); // Only when exactly one trusted proxy hop is in front.

// IP logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const ms = Date.now() - start;
        console.log(`${req.ip} ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    });
    next();
});

app.get("/", (req, res) => res.send("ok"));
app.listen(3000);
```

## Conclusion

`req.socket.remoteAddress` returns the direct connection's IP, which may be `::ffff:x.x.x.x` for IPv4-mapped IPv6 - normalize that prefix before returning it. Set `app.set("trust proxy", 1)` in Express only when there is exactly one trusted proxy hop in front of the app, so `req.ip` is derived from `X-Forwarded-For` using Express's trust proxy rules. Never trust `X-Forwarded-For` from untrusted sources - only read forwarded headers from known proxies.
