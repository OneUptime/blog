# How to Handle IPv6 Addresses in Node.js Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, IPv6, Networking, JavaScript, Socket Programming, Development

Description: Handle, validate, parse, and use IPv6 addresses in Node.js applications using built-in net and dns modules and popular third-party validation libraries.

## Introduction

Node.js has built-in support for IPv6 through its `net`, `dns`, and `http` modules. The `net.isIPv6()` function provides quick validation, while Express and other web frameworks use Node's underlying server binding behavior when accepting IPv6 connections.

## Basic IPv6 Validation

Node.js provides built-in IPv6 checking:

```javascript
const net = require('net');

// Built-in IPv6 validation
const addresses = [
  '2001:db8::1',
  '::1',
  'fe80::1',
  '192.168.1.1',  // IPv4
  'not-an-address'
];

addresses.forEach(addr => {
  const isV6 = net.isIPv6(addr);
  const isV4 = net.isIPv4(addr);
  const isIP = net.isIP(addr); // Returns 4, 6, or 0
  console.log(`${addr}: isIPv6=${isV6}, version=${isIP}`);
});
```

## Stripping Zone IDs from Link-Local Addresses

Link-local IPv6 addresses may include a zone ID (interface name). Some APIs expect the bare address literal, so strip the zone ID first:

```javascript
const net = require('net');

/**
 * Strip zone ID from an IPv6 address when an API expects the bare literal.
 * e.g., "fe80::1%eth0" → "fe80::1"
 */
function stripZoneId(addr) {
  const zoneIdx = addr.indexOf('%');
  return zoneIdx !== -1 ? addr.substring(0, zoneIdx) : addr;
}

// Format a bare IPv6 host literal with bracket notation
function formatIPv6HostLiteral(addr) {
  const clean = stripZoneId(addr);
  if (net.isIPv6(clean)) {
    return `[${clean}]`;
  }
  return clean;
}

console.log(formatIPv6HostLiteral('2001:db8::1'));     // [2001:db8::1]
console.log(formatIPv6HostLiteral('fe80::1%eth0'));    // [fe80::1]
console.log(formatIPv6HostLiteral('192.168.1.1'));     // 192.168.1.1
```

## Creating an IPv6 TCP Server

```javascript
const net = require('net');

// Create TCP server that listens on IPv6
const server = net.createServer((socket) => {
  // remoteAddress contains the IPv6 address (without brackets)
  const remoteAddr = socket.remoteAddress;
  const remotePort = socket.remotePort;
  const family = socket.remoteFamily;  // 'IPv6' or 'IPv4'
  const printableAddr = family === 'IPv6' ? `[${remoteAddr}]` : remoteAddr;

  console.log(`Connection from ${printableAddr}:${remotePort} (${family})`);

  socket.write('Hello from IPv6 server\n');
  socket.end();
});

// '::' is the IPv6 wildcard address, listens on all interfaces
// On most operating systems, listening on '::' may also accept IPv4 connections
server.listen(8080, '::', () => {
  console.log('Server listening on [::]:8080');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
```

## Connecting to an IPv6 Server

```javascript
const net = require('net');

// Connect to an IPv6 server
const client = net.createConnection({
  host: '2001:db8::1',  // IPv6 address (no brackets needed here)
  port: 8080,
  family: 6             // Force IPv6 (4 for IPv4, 0 for auto)
}, () => {
  console.log('Connected to IPv6 server');
  client.write('Hello server\n');
});

client.on('data', (data) => {
  console.log('Received:', data.toString());
  client.end();
});

client.on('error', (err) => {
  console.error('Connection error:', err.message);
});
```

## Express.js Server on IPv6

```javascript
const express = require('express');
const net = require('net');
const app = express();

app.get('/', (req, res) => {
  // Express stores the client IP in req.ip
  // It may look like ::ffff:192.168.1.1 for an IPv4 client on an IPv6 socket,
  // or 2001:db8::1 for a native IPv6 client
  const clientIP = req.ip;

  res.json({
    message: 'Hello',
    clientIP,
    isIPv6: net.isIPv6(clientIP)
  });
});

// Listen on IPv6 wildcard address
const server = app.listen(3000, '::', () => {
  const { address, port } = server.address();
  console.log(`Express listening on [${address}]:${port}`);
});
```

## DNS AAAA Record Lookup

```javascript
const dns = require('dns').promises;

async function lookupIPv6(hostname) {
  try {
    // Resolve AAAA records explicitly
    const addresses = await dns.resolve6(hostname);
    return addresses;
  } catch (err) {
    if (err.code === 'ENODATA') {
      return [];  // No AAAA records
    }
    throw err;
  }
}

// Example usage
async function main() {
  const ipv6Addrs = await lookupIPv6('ipv6.google.com');
  console.log('IPv6 addresses:', ipv6Addrs);

  // Protocol-agnostic lookup (may return both A and AAAA, depending on records and resolver behavior)
  const all = await dns.lookup('google.com', { all: true, family: 0 });
  all.forEach(({ address, family }) => {
    console.log(`${family === 6 ? 'AAAA' : 'A'}: ${address}`);
  });
}

main().catch(console.error);
```

## Extracting Client IP from Request Headers

```javascript
/**
 * Extract client IP from X-Forwarded-For when you trust the reverse proxy;
 * otherwise, fall back to the socket address.
 * Handles IPv6 addresses including IPv4-mapped IPv6.
 */
function getClientIP(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Take the first IP in the chain
    const firstIP = forwardedFor.split(',')[0].trim();
    // Strip IPv4-mapped prefix (::ffff:x.x.x.x)
    return firstIP.replace(/^::ffff:/, '');
  }

  const remoteIP = req.socket.remoteAddress || '';
  return remoteIP.replace(/^::ffff:/, '');
}
```

## Conclusion

Node.js handles IPv6 through the same APIs as IPv4, with `net.isIPv6()` for validation, `'::'` as the wildcard bind address, and no bracket notation needed when passing addresses to `net.createConnection()`. Always handle IPv4-mapped IPv6 addresses (`::ffff:x.x.x.x`) when extracting client IPs from requests.
