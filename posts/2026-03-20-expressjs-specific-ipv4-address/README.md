# How to Configure Express.js to Listen on a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Express, Node.js, IPv4, Networking, JavaScript, Configuration

Description: Learn how to configure an Express.js server to listen on a specific IPv4 address, use environment-driven bind configuration, and handle multi-interface deployments.

## Basic Bind to Specific IPv4 Address

```javascript
const express = require("express");
const app = express();

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

const HOST = "192.168.1.10";  // Specific interface
const PORT = 3000;

const server = app.listen(PORT, HOST, () => {
    const { address, port } = server.address();
    console.log(`Listening on http://${address}:${port}`);
});
```

## Environment-Driven Configuration

```javascript
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Hello"));

const HOST = process.env.HOST || "0.0.0.0";
const parsedPort = Number.parseInt(process.env.PORT ?? "", 10);
const PORT = Number.isNaN(parsedPort) ? 3000 : parsedPort;

app.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
});
```

```bash
# Bind to all IPv4 interfaces (default)

node app.js

# Bind to localhost only
HOST=127.0.0.1 node app.js

# Bind to specific NIC
HOST=192.168.1.10 PORT=8080 node app.js
```

## Listening on Multiple Addresses

```javascript
const express = require("express");
const http = require("http");

const app = express();

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Create separate servers for different interfaces
const publicServer = http.createServer(app);
const adminServer  = http.createServer(app);  // same app, different bind

publicServer.listen(3000, "0.0.0.0", () => {
    console.log("Public API on 0.0.0.0:3000");
});

adminServer.listen(3001, "127.0.0.1", () => {
    console.log("Admin API on 127.0.0.1:3001 (localhost only)");
});
```

## Getting the Client IP

```javascript
const express = require("express");
const app = express();

// Trust exactly one reverse-proxy hop (for example, a single Nginx layer)
app.set("trust proxy", 1);

app.get("/whoami", (req, res) => {
    // req.ip respects trust proxy setting
    res.json({ ip: req.ip });
});

app.listen(3000, "0.0.0.0");
```

## Graceful Shutdown

```javascript
const express = require("express");
const app = express();
const server = app.listen(3000, "0.0.0.0", () => {
    console.log("Server started");
});

process.on("SIGTERM", () => {
    console.log("SIGTERM received - shutting down gracefully");
    server.close(() => {
        console.log("All connections closed");
        process.exit(0);
    });
    // Force close after 10 seconds
    setTimeout(() => process.exit(1), 10000);
});
```

## Checking Available Interfaces at Startup

```javascript
const os = require("os");

function getIPv4Interfaces() {
    const ifaces = os.networkInterfaces();
    const results = [];
    for (const [name, addrs] of Object.entries(ifaces)) {
        for (const addr of addrs) {
            if (addr.family === "IPv4") {
                results.push({ name, address: addr.address, internal: addr.internal });
            }
        }
    }
    return results;
}

const ifaces = getIPv4Interfaces();
console.log("Available IPv4 interfaces:");
ifaces.forEach(i => console.log(`  ${i.name}: ${i.address} (internal=${i.internal})`));
```

## Conclusion

`app.listen(PORT, HOST, callback)` is the only change needed to bind Express to a specific address. Use `process.env.HOST` to make the bind address configurable without code changes. If Nginx is on the same host, bind to `127.0.0.1` and place Nginx in front to handle TLS, compression, and rate limiting. Set `app.set("trust proxy", 1)` only when Express is behind exactly one reverse proxy; otherwise configure `trust proxy` to match your actual proxy topology so `req.ip` is derived correctly from `X-Forwarded-For`.
