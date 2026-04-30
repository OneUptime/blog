# How to Create IPv6 TCP Servers in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, IPv6, TCP, Net Module, Networking

Description: Create IPv6 TCP servers in Node.js using the net module, handle dual-stack connections, and build protocol-aware servers.

## Basic IPv6 TCP Server

```javascript
const net = require('net');

const server = net.createServer((socket) => {
    const clientAddr = socket.remoteAddress;
    const clientPort = socket.remotePort;
    console.log(`Client connected: [${clientAddr}]:${clientPort}`);

    socket.on('data', (data) => {
        const msg = data.toString().trim();
        console.log(`Received: ${msg}`);
        socket.write(`Echo: ${msg}\n`);
    });

    socket.on('end', () => {
        console.log(`Client disconnected: ${clientAddr}`);
    });

    socket.on('error', (err) => {
        console.error(`Socket error: ${err.message}`);
    });
});

// Listen on the IPv6 unspecified address (::).
// On most operating systems this may also accept IPv4 connections.
server.listen(9000, '::', () => {
    const addr = server.address();
    console.log(`IPv6 TCP server on [${addr.address}]:${addr.port}`);
});
```

## IPv6 TCP Client

```javascript
const net = require('net');

function connectIPv6(host, port) {
    const client = new net.Socket();

    client.connect(port, host, () => {
        console.log(`Connected to [${host}]:${port}`);
        console.log(`Local: [${client.localAddress}]:${client.localPort}`);

        client.write('Hello IPv6 TCP\n');
    });

    client.on('data', (data) => {
        console.log('Received:', data.toString());
        client.destroy();
    });

    client.on('close', () => {
        console.log('Connection closed');
    });

    client.on('error', (err) => {
        console.error('Error:', err.message);
    });

    return client;
}

connectIPv6('::1', 9000);
```

## IPv6-Only vs Dual-Stack Server

```javascript
const net = require('net');

// On most operating systems, binding to :: also accepts IPv4
// connections as IPv4-mapped IPv6 addresses (::ffff:x.x.x.x).
const dualStack = net.createServer((socket) => {
    let addr = socket.remoteAddress;
    const isIPv4Mapped = addr && addr.startsWith('::ffff:');
    if (isIPv4Mapped) addr = addr.slice(7);

    console.log(`[dual-stack] Client: ${addr} (${isIPv4Mapped ? 'IPv4' : 'IPv6'})`);
    socket.end('OK\n');
});
dualStack.listen(9001, '::', () => console.log('Dual-stack on [::]:9001'));

// IPv6-only: only accepts IPv6 connections
const ipv6Only = net.createServer((socket) => {
    console.log(`[ipv6-only] Client: ${socket.remoteAddress}`);
    socket.end('OK\n');
});
// Use ipv6Only to disable dual-stack behavior when binding to ::.
ipv6Only.listen({ host: '::', port: 9002, ipv6Only: true }, () => {
    console.log('IPv6-only on [::]:9002');
});
```

## Line-Framed Protocol Server

Build a newline-delimited JSON server over IPv6:

```javascript
const net = require('net');

const server = net.createServer((socket) => {
    let buffer = '';
    socket.setEncoding('utf8');

    socket.on('data', (chunk) => {
        buffer += chunk;
        let idx;

        // Process complete lines
        while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);

            if (!line.trim()) continue;

            try {
                const msg = JSON.parse(line);
                console.log(`From [${socket.remoteAddress}]:`, msg);

                const response = JSON.stringify({
                    status: 'ok',
                    echo: msg,
                    server_time: new Date().toISOString(),
                }) + '\n';

                socket.write(response);
            } catch (e) {
                socket.write(JSON.stringify({ error: 'invalid JSON' }) + '\n');
            }
        }
    });
});

server.listen(9000, '::', () => {
    console.log('JSON protocol server on [::]:9000');
});
```

## Connection Tracking

```javascript
const net = require('net');

const connections = new Map();

const server = net.createServer((socket) => {
    const id = `[${socket.remoteAddress}]:${socket.remotePort}`;
    connections.set(id, {
        socket,
        connectedAt: new Date(),
        bytesReceived: 0,
    });

    console.log(`+${id} (total: ${connections.size})`);

    socket.on('data', (data) => {
        const conn = connections.get(id);
        if (conn) conn.bytesReceived += data.length;
        socket.write(data);  // Echo
    });

    socket.on('close', () => {
        const conn = connections.get(id);
        if (conn) {
            const duration = Date.now() - conn.connectedAt.getTime();
            console.log(`-${id} duration=${duration}ms bytes=${conn.bytesReceived}`);
        }
        connections.delete(id);
        console.log(`Active connections: ${connections.size}`);
    });
});

server.listen(9000, '::', () => console.log('Tracking server on [::]:9000'));

// Print stats every 30 seconds
setInterval(() => {
    console.log(`Connections: ${connections.size}`);
}, 30_000);
```

## Conclusion

Node.js's `net` module supports IPv6 through `listen(port, '::')`. Binding to `::` listens on the IPv6 unspecified address and, on most operating systems, may also accept IPv4 connections. The `ipv6Only: true` listen option disables that dual-stack behavior. Client addresses arrive via `socket.remoteAddress` with IPv4 connections appearing as `::ffff:x.x.x.x` on dual-stack servers. For application protocols, buffer incoming data and process complete framing units (lines, length-prefixed, etc.) rather than treating each `data` event as a complete message.
