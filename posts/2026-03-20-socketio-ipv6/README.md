# How to Configure Socket.io with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Socket.IO, IPv6, Node.js, Real-Time, WebSocket

Description: Configure Socket.io server to accept connections from IPv6 clients with dual-stack support and proper address extraction.

## Overview

Configure Socket.io server to accept connections from IPv6 clients with dual-stack support and proper address extraction. This guide covers the essential configuration and best practices for IPv6 compatibility.

## Prerequisites

- Basic knowledge of Socket.IO and WebSocket transport
- IPv6 connectivity on your server
- The relevant software or framework installed

## IPv6 Socket.IO Fundamentals

Socket.IO uses HTTP-based transports and can upgrade to WebSocket. For IPv6 support, ensure:
1. Your server binds to `::` (all IPv6 interfaces) and leaves dual-stack support enabled when you need IPv4 and IPv6
2. Firewalls allow TCP on the Socket.IO port over IPv6
3. Client URLs use bracketed IPv6 addresses: `http://[::1]:8080/`

## Configuration

### Server Binding

```javascript
// Socket.IO server - bind to IPv6
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer);

io.on('connection', (socket) => {
    // Get client IPv6 address
    const clientIP = socket.handshake.address;
    console.log('Client:', clientIP);

    socket.on('hello', (message) => {
        socket.emit('reply', `Received over IPv6: ${message}`);
    });
});

httpServer.listen({ port: 8080, host: '::', ipv6Only: false }, () => {
    console.log('Socket.IO server listening on [::]:8080');
});
```

### Firewall Rules

```bash
# Allow Socket.IO port over IPv6

sudo ip6tables -A INPUT -p tcp --dport 8080 -m comment --comment "Socket.IO IPv6" -j ACCEPT

# Verify the rule is in place
sudo ip6tables -L INPUT -v -n | grep 8080
```

### Client Connection

```javascript
// Node.js Socket.IO client - IPv6 address needs brackets
const { io } = require('socket.io-client');

const socket = io('http://[2001:db8::1]:8080', {
    transports: ['websocket'],
});

socket.on('connect', () => {
    socket.emit('hello', 'Hello over IPv6!');
});

socket.on('reply', (message) => {
    console.log('Received:', message);
});
```

## Testing

```bash
# Test Socket.IO connectivity over IPv6
npm install socket.io-client
node -e 'const { io } = require("socket.io-client"); const socket = io("http://[::1]:8080", { transports: ["websocket"], timeout: 5000 }); socket.on("connect", () => { console.log("connected", socket.id); socket.close(); }); socket.on("disconnect", () => process.exit(0)); socket.on("connect_error", (err) => { console.error(err.message); process.exit(1); });'

# Verify server is listening on IPv6
sudo ss -6 -tlnp | grep 8080

# Check for IPv6 in access logs if NGINX is in front
tail -f /var/log/nginx/access.log | grep "::"
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor Socket.IO endpoint availability over IPv6. Create TCP port monitors for your Socket.IO port at your IPv6 address and configure alerts for connection failures or elevated error rates.

## Conclusion

How to Configure Socket.io with IPv6 requires binding to IPv6 interfaces, configuring firewalls, and using correct IPv6 URL format for clients. Test thoroughly with the Socket.IO client and automate IPv6-specific connectivity tests in your CI/CD pipeline.
