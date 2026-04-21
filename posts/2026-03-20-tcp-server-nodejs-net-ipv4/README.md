# How to Create a TCP Server in Node.js Using the net Module with IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, TCP, Socket, IPv4, Networking, Net Module

Description: Learn how to create a TCP server in Node.js using the built-in net module that listens on an IPv4 address and handles client connections.

## Basic TCP Echo Server

```javascript
const net = require('net');

const HOST = '0.0.0.0';  // Listen on all IPv4 interfaces
const PORT = 9000;

// Create the TCP server
const server = net.createServer((socket) => {
    const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`Client connected: ${clientAddr}`);

    // 'data' event fires when the client sends data
    socket.on('data', (data) => {
        console.log(`[${clientAddr}] Received: ${data.toString().trim()}`);
        // Echo the data back
        socket.write(data);
    });

    // 'end' event fires when the client closes the connection
    socket.on('end', () => {
        console.log(`Client disconnected: ${clientAddr}`);
    });

    // 'error' event fires on socket errors (e.g., connection reset)
    socket.on('error', (err) => {
        console.error(`Socket error from ${clientAddr}: ${err.message}`);
    });
});

// Handle server-level errors (e.g., EADDRINUSE)
server.on('error', (err) => {
    console.error(`Server error: ${err.message}`);
    process.exit(1);
});

// Start listening; HOST is an IPv4 wildcard address
server.listen({ host: HOST, port: PORT }, () => {
    console.log(`TCP server listening on ${HOST}:${PORT}`);
});
```

## Tracking Connected Clients

```javascript
const net = require('net');

const clients = new Map();  // Map of socket -> client info

let clientCounter = 0;

const server = net.createServer((socket) => {
    const id = ++clientCounter;
    const addr = `${socket.remoteAddress}:${socket.remotePort}`;
    clients.set(socket, { id, addr });

    console.log(`[#${id}] Connected: ${addr} (total: ${clients.size})`);

    socket.on('data', (data) => {
        const msg = data.toString().trim();
        console.log(`[#${id}] ${msg}`);

        // Broadcast to all other clients
        for (const [clientSocket, info] of clients) {
            if (clientSocket !== socket && !clientSocket.destroyed) {
                clientSocket.write(`[#${id}] ${msg}\n`);
            }
        }
    });

    const cleanup = () => {
        clients.delete(socket);
        console.log(`[#${id}] Disconnected (remaining: ${clients.size})`);
    };

    socket.on('end', cleanup);
    socket.on('error', (err) => {
        console.error(`[#${id}] Error: ${err.message}`);
        cleanup();
    });
});

server.listen(9000, '0.0.0.0', () => {
    console.log('Chat server on port 9000');
});
```

## Setting Socket Options

```javascript
const net = require('net');

const server = net.createServer((socket) => {
    // Set idle timeout: close idle connections after 30 seconds
    socket.setTimeout(30000);
    socket.on('timeout', () => {
        console.log(`Timeout: closing ${socket.remoteAddress}`);
        socket.end();
    });

    // Disable Nagle's algorithm for low-latency applications
    socket.setNoDelay(true);

    // Enable TCP keepalive
    socket.setKeepAlive(true, 60000);  // Start after 60 seconds idle

    socket.on('data', (data) => {
        socket.write(data);
    });
});

server.listen(9000, '0.0.0.0');
```

## Graceful Shutdown

```javascript
const net = require('net');

const server = net.createServer((socket) => {
    socket.on('data', (d) => socket.write(d));
});

server.listen(9000, '0.0.0.0', () => {
    console.log('Server running on port 9000');
});

// Handle SIGINT and SIGTERM
const shutdown = () => {
    console.log('Shutting down...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

## Conclusion

Node.js TCP servers are built with `net.createServer()`, binding with `server.listen({ host, port })` or `server.listen(port, host)`. Use an IPv4 literal such as `0.0.0.0` or `127.0.0.1` as the host when you want an IPv4 listener. Each client connection provides a `socket` object, which emits `data`, `end`, and `error` events. Use `socket.setNoDelay()` for low-latency applications, `socket.setTimeout()` for idle connection management, and `server.close()` for graceful shutdown.
