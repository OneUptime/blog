# How to Use IPv6 UDP Sockets in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, IPv6, UDP, Dgram, Multicast, Networking

Description: Use IPv6 UDP sockets in Node.js with the dgram module for unicast messaging, multicast groups, and low-latency communication.

## Basic IPv6 UDP Server

Node.js's `dgram` module supports IPv6 via `'udp6'` socket type:

```javascript
const dgram = require('dgram');

const server = dgram.createSocket('udp6');

server.on('message', (msg, rinfo) => {
    console.log(`From [${rinfo.address}]:${rinfo.port}: ${msg.toString()}`);

    // Echo back
    server.send(msg, rinfo.port, rinfo.address, (err) => {
        if (err) console.error('Send error:', err);
    });
});

server.on('listening', () => {
    const addr = server.address();
    console.log(`UDP6 server on [${addr.address}]:${addr.port}`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
    server.close();
});

server.bind(9000, '::');
```

## IPv6 UDP Client

```javascript
const dgram = require('dgram');

const client = dgram.createSocket('udp6');
const timeout = setTimeout(() => {
    console.log('Timeout');
    client.close();
}, 5000);

// Bind to ephemeral port
client.bind(0, '::', () => {
    const message = Buffer.from('Hello IPv6 UDP');
    const server = '::1';
    const port = 9000;

    client.send(message, port, server, (err) => {
        if (err) {
            clearTimeout(timeout);
            console.error('Send failed:', err);
            client.close();
            return;
        }
        console.log(`Sent ${message.length} bytes to [${server}]:${port}`);
    });
});

client.on('message', (msg, rinfo) => {
    clearTimeout(timeout);
    console.log(`Response from [${rinfo.address}]:${rinfo.port}: ${msg.toString()}`);
    client.close();
});
```

## IPv6 Multicast

```javascript
const dgram = require('dgram');
const os = require('os');

// Find a scoped IPv6 interface identifier for multicast
function getIPv6MulticastInterface() {
    const ifaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(ifaces)) {
        const addr = addrs.find(
            (a) => a.family === 'IPv6' && !a.internal && a.address.startsWith('fe80:')
        );

        if (addr) {
            const scope = process.platform === 'win32' ? addr.scopeid : name;
            return `::%${scope}`;
        }
    }
    return null;
}

// Multicast receiver
const receiver = dgram.createSocket({ type: 'udp6', reuseAddr: true });

receiver.on('message', (msg, rinfo) => {
    console.log(`Multicast from [${rinfo.address}]: ${msg.toString()}`);
});

receiver.bind(5000, () => {
    const iface = getIPv6MulticastInterface();
    if (!iface) throw new Error('No non-loopback IPv6 interface found');

    receiver.addMembership('ff02::1', iface);
    console.log(`Joined ff02::1 on ${iface}`);
});
```

## Multicast Sender

```javascript
const dgram = require('dgram');
const os = require('os');

function getIPv6MulticastInterface() {
    const ifaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(ifaces)) {
        const addr = addrs.find(
            (a) => a.family === 'IPv6' && !a.internal && a.address.startsWith('fe80:')
        );

        if (addr) {
            const scope = process.platform === 'win32' ? addr.scopeid : name;
            return `::%${scope}`;
        }
    }
    return null;
}

const sender = dgram.createSocket('udp6');

sender.bind(0, '::', () => {
    const iface = getIPv6MulticastInterface();
    if (!iface) throw new Error('No non-loopback IPv6 interface found');

    // Set multicast outgoing interface
    sender.setMulticastInterface(iface);
    sender.setMulticastTTL(5);

    const msg = Buffer.from('Multicast announcement');

    // Send to all-nodes link-local multicast
    sender.send(msg, 5000, 'ff02::1', (err) => {
        if (err) console.error(err);
        else console.log('Multicast sent to ff02::1');
        sender.close();
    });
});
```

## Dual-Type UDP Socket (udp4 and udp6)

```javascript
const dgram = require('dgram');

// Handle both IPv4 and IPv6 with two sockets
function createDualUDPServer(port, onMessage) {
    const v4 = dgram.createSocket('udp4');
    const v6 = dgram.createSocket({ type: 'udp6', ipv6Only: true });

    const handler = (msg, rinfo) => onMessage(msg, rinfo);

    v4.on('message', handler);
    v6.on('message', handler);

    v4.bind(port, '0.0.0.0');
    v6.bind(port, '::');

    return { v4, v6 };
}

const { v4, v6 } = createDualUDPServer(9000, (msg, rinfo) => {
    console.log(`[${rinfo.family}] From [${rinfo.address}]: ${msg}`);
});

v4.on('listening', () => console.log(`v4 on ${v4.address().port}`));
v6.on('listening', () => console.log(`v6 on ${v6.address().port}`));
```

## UDP Metrics Collector

```javascript
const dgram = require('dgram');

// Simple statsd-like metric receiver over IPv6 UDP
const server = dgram.createSocket('udp6');
const metrics = new Map();

server.on('message', (msg, rinfo) => {
    const line = msg.toString().trim();
    // Format: "metric_name:value|type" (statsd-like)
    const match = line.match(/^([^:]+):(\d+)\|(c|g|ms)$/);
    if (!match) return;

    const [, name, value, type] = match;
    const prev = metrics.get(name) || 0;

    if (type === 'c') metrics.set(name, prev + parseInt(value));
    else metrics.set(name, parseInt(value));
});

server.bind(8125, '::', () => {
    console.log('Metrics server on [::]:8125');
});

setInterval(() => {
    console.log('--- Metrics ---');
    for (const [k, v] of metrics.entries()) {
        console.log(`  ${k} = ${v}`);
    }
}, 10_000);
```

## Conclusion

Node.js `dgram.createSocket('udp6')` creates an IPv6 UDP socket, but it is not IPv6-only by default when you bind to `'::'`. Bind to `'::'` to receive on all IPv6 addresses, and use `ipv6Only: true` when you need a separate IPv4 socket on the same port. Multicast receivers join a group with `addMembership(multicastAddr, multicastInterface)` after binding, using a scoped IPv6 interface such as `'::%eth0'` (or `'::%2'` on Windows). For multicast sending, use `setMulticastInterface()` to specify the outgoing interface. Explicit zone IDs in scoped multicast addresses look like `'ff02::1%eth0'` on Unix-like systems. When you need both IPv4 and IPv6 UDP, create two separate sockets - one `'udp4'` and one IPv6 socket created with `{ type: 'udp6', ipv6Only: true }`.
