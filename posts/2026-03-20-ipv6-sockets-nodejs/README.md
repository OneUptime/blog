# How to Create IPv6 Sockets in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, IPv6, Socket, Networking, Dgram, Net Module, Socket Programming

Description: Create IPv6 TCP and UDP sockets in Node.js using the net and dgram modules, implementing both servers and clients with proper IPv6 address handling.

## Introduction

Node.js supports IPv6 sockets through the built-in `net` module (TCP) and `dgram` module (UDP). IPv6 sockets are created by specifying `'::'` as the bind address, using `'udp6'` for UDP sockets, or setting `family: 6` for TCP client connections. This guide covers creating IPv6-specific and dual-stack network servers and clients.

## IPv6 TCP Server

```javascript
const net = require('net');

// Create IPv6 TCP server
const server = net.createServer((socket) => {
  // socket.remoteAddress returns IPv6 without brackets
  const remoteAddr = socket.remoteAddress;
  const remotePort = socket.remotePort;
  const family = socket.remoteFamily;  // 'IPv6' or 'IPv4'

  console.log(`Client: [${remoteAddr}]:${remotePort} (${family})`);

  socket.write('Hello IPv6 client!\n');

  socket.on('data', (data) => {
    console.log(`Data from ${remoteAddr}: ${data.toString().trim()}`);
  });

  socket.on('end', () => {
    console.log(`${remoteAddr} disconnected`);
  });

  socket.on('error', (err) => {
    console.error(`Socket error: ${err.message}`);
  });
});

// Listen on IPv6 wildcard address '::' port 8080
// By default, ipv6Only is false, so on platforms with dual-stack support
// IPv4 clients can appear as IPv4-mapped IPv6 addresses
server.listen(8080, '::', () => {
  const addr = server.address();
  console.log(`IPv6 TCP server on [${addr.address}]:${addr.port}`);
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
});
```

## IPv6 TCP Client

```javascript
const net = require('net');

function connectIPv6(host, port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host,
      port,
      family: 6,   // 6 = IPv6 only, 4 = IPv4 only, 0 = auto
    }, () => {
      console.log(`Connected to [${socket.remoteAddress}]:${socket.remotePort}`);
      resolve(socket);
    });

    socket.on('error', reject);
    socket.setTimeout(10000, () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

// Connect to IPv6 loopback
async function main() {
  try {
    const socket = await connectIPv6('::1', 8080);

    socket.on('data', (data) => {
      console.log('Server:', data.toString());
      socket.end();
    });

    socket.write('Hello server!\n');
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

main();
```

## IPv6 UDP Socket

```javascript
const dgram = require('dgram');

// Create IPv6 UDP socket
// 'udp6' = IPv6 UDP
// 'udp4' = IPv4 UDP
const server = dgram.createSocket('udp6');

server.on('message', (msg, rinfo) => {
  console.log(`UDP from [${rinfo.address}]:${rinfo.port} (${rinfo.family}): ${msg}`);

  // Send reply
  const reply = Buffer.from('ACK');
  server.send(reply, rinfo.port, rinfo.address, (err) => {
    if (err) console.error('Send error:', err);
  });
});

server.on('error', (err) => {
  console.error('UDP error:', err);
  server.close();
});

server.on('listening', () => {
  const addr = server.address();
  console.log(`UDP server on [${addr.address}]:${addr.port}`);
});

// Bind to IPv6 wildcard
server.bind(41234, '::');
```

## IPv6 UDP Client

```javascript
const dgram = require('dgram');

function sendUDPv6(message, host, port) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp6');
    const buf = Buffer.from(message);
    const timeout = setTimeout(() => {
      client.close();
      reject(new Error('UDP timeout'));
    }, 5000);

    client.send(buf, port, host, (err) => {
      if (err) {
        clearTimeout(timeout);
        client.close();
        reject(err);
        return;
      }
      console.log(`Sent "${message}" to [${host}]:${port}`);
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      client.close();
      reject(err);
    });

    client.on('message', (reply, rinfo) => {
      clearTimeout(timeout);
      console.log(`Reply from [${rinfo.address}]: ${reply}`);
      client.close();
      resolve(reply.toString());
    });
  });
}

// Send UDP datagram to IPv6 server
sendUDPv6('Hello UDP IPv6', '::1', 41234)
  .then(reply => console.log('Got:', reply))
  .catch(err => console.error('Error:', err.message));
```

## Dual-Stack TCP Server

```javascript
const net = require('net');

// Creates a server that accepts both IPv4 and IPv6
// when the OS supports dual-stack sockets
const server = net.createServer((socket) => {
  let clientIP = socket.remoteAddress;
  const family = socket.remoteFamily;

  // Strip IPv4-mapped prefix (::ffff:x.x.x.x)
  if (clientIP && clientIP.startsWith('::ffff:')) {
    clientIP = clientIP.slice(7);
  }

  console.log(`${family} client: ${clientIP}:${socket.remotePort}`);
  socket.write(`Your IP: ${clientIP}\n`);
  socket.end();
});

// With ipv6Only: false, binding to :: keeps dual-stack support enabled
server.listen({ port: 8080, host: '::', ipv6Only: false }, () => {
  console.log('Dual-stack server on [::]:8080');
});
```

## Checking Available IPv6 Interfaces

```javascript
const os = require('os');

function getIPv6Interfaces() {
  const ifaces = os.networkInterfaces();
  const result = {};

  Object.entries(ifaces).forEach(([name, addrs]) => {
    const ipv6addrs = addrs.filter(a => a.family === 'IPv6');
    if (ipv6addrs.length > 0) {
      result[name] = ipv6addrs.map(a => ({
        address: a.address,
        prefix: a.cidr,
        internal: a.internal
      }));
    }
  });

  return result;
}

console.log('IPv6 interfaces:', JSON.stringify(getIPv6Interfaces(), null, 2));
```

## Conclusion

Node.js IPv6 socket creation uses `'::'` as the bind address for TCP servers, `'udp6'` socket type for IPv6 UDP, and `family: 6` in `net.createConnection` options to force IPv6. The `remoteAddress` property on connected sockets returns the bare IPv6 address without brackets. Strip the `::ffff:` prefix when handling IPv4-mapped IPv6 addresses to get the real IPv4 address.
