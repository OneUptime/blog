# How to Set Socket Options for IPv4 in Node.js net Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Socket Options, IPv4, TCP, Net Module, Performance, Networking

Description: Configure low-level IPv4 socket options in Node.js using the net module's built-in methods and the optional socket-on-connect technique for advanced tuning.

## Introduction

The Node.js `net` module exposes several socket options through its `Socket` and `Server` classes. Properly configuring these options - such as `TCP_NODELAY`, keep-alive settings, and buffer sizes - can significantly improve performance and reliability for TCP-based applications over IPv4.

## Available Socket Options in Node.js

| Method | Option | Description |
|--------|--------|-------------|
| `socket.setNoDelay(true)` | TCP_NODELAY | Disable Nagle's algorithm |
| `socket.setKeepAlive(true, delay)` | SO_KEEPALIVE | Enable TCP keepalive probes |
| `socket.setTimeout(ms)` | Inactivity timer | Emit 'timeout' after idle |
| `socket.allowHalfOpen` | TCP half-open | Keep reading after FIN |

## Setting TCP_NODELAY (Disable Nagle's Algorithm)

Nagle's algorithm buffers small packets to reduce overhead. For low-latency applications (SSH, RPC, gaming), disable it:

```javascript
const net = require('net');

const server = net.createServer((socket) => {
  // Disable Nagle's algorithm - send packets immediately
  socket.setNoDelay(true);
  
  socket.on('data', (data) => {
    // Response sent immediately without buffering
    socket.write(`Echo: ${data}`);
  });
});

server.listen(8080, '0.0.0.0');
```

For the client:

```javascript
const client = net.createConnection({
  host: '192.168.1.100',
  port: 8080,
  family: 4,             // Force IPv4
  noDelay: true          // TCP_NODELAY at connection time
});
```

## Configuring TCP Keep-Alive

Keep-alive probes detect dead connections without application-level heartbeats:

```javascript
const server = net.createServer((socket) => {
  // Enable keepalive with 30-second initial delay
  socket.setKeepAlive(true, 30000);
  
  // Additional keepalive parameters (interval, probe count) require OS-level tuning
  console.log(`Keep-alive enabled for ${socket.remoteAddress}`);
  
  socket.on('data', (data) => {
    socket.write(data);
  });
});
```

## Setting Inactivity Timeout

```javascript
const server = net.createServer((socket) => {
  // Close the connection if idle for more than 60 seconds
  socket.setTimeout(60000);
  
  socket.on('timeout', () => {
    console.log(`Client ${socket.remoteAddress} idle for 60s - closing`);
    socket.end('Idle timeout\n');
  });
  
  socket.on('data', (data) => {
    // Reset the timeout timer on each received packet
    socket.setTimeout(60000);
    socket.write(data);
  });
});
```

## Configuring Half-Open Connections

By default, when the remote end sends FIN (signals end of writing), Node.js closes both sides. With `allowHalfOpen`, you can continue reading until your write completes:

```javascript
// Allow half-open: keep reading after remote FIN until we finish writing
const server = net.createServer({ allowHalfOpen: true }, (socket) => {
  let received = [];
  
  socket.on('data', (data) => received.push(data));
  
  socket.on('end', () => {
    // Remote finished writing - process and respond
    const body = Buffer.concat(received);
    console.log(`Received ${body.length} bytes`);
    
    // Now we finish writing and close
    socket.end(`Received ${body.length} bytes\n`);
  });
});
```

## Binding to a Specific IPv4 Address

```javascript
// Server: bind to a specific IPv4 interface
server.listen({
  host: '192.168.1.10',   // Bind only to this IP
  port: 8080,
  ipv6Only: false          // Accept IPv4 only
});

// Client: source-bind to a specific IPv4 address
const client = net.createConnection({
  host: '10.0.0.1',
  port: 8080,
  family: 4,               // Force IPv4
  localAddress: '192.168.1.10',  // Bind source IP
  localPort: 0             // Let OS choose source port
});
```

## Complete Server with All Options

```javascript
const net = require('net');

const server = net.createServer({
  allowHalfOpen: false,    // Close both sides when remote sends FIN
  pauseOnConnect: false    // Start reading immediately
}, (socket) => {
  socket.setNoDelay(true);                      // TCP_NODELAY
  socket.setKeepAlive(true, 60000);             // Keepalive after 60s idle
  socket.setTimeout(300000);                     // 5-minute inactivity timeout
  socket.setEncoding('utf8');                    // Decode data as UTF-8 strings
  
  socket.on('timeout', () => socket.destroy(new Error('Idle timeout')));
  socket.on('error', (err) => console.error(`Socket error: ${err.message}`));
  socket.on('data', (data) => socket.write(data));
});

server.maxConnections = 500;

server.listen(8080, '0.0.0.0', () => {
  console.log('Server listening on port 8080');
});
```

## Conclusion

The Node.js `net` module provides the most important socket options through clean, high-level methods. For most applications, enabling `TCP_NODELAY`, configuring keepalive, and setting an inactivity timeout is sufficient to build reliable, production-ready TCP servers over IPv4.
