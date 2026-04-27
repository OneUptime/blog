# How to Parse and Validate IPv6 Addresses in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, IPv6, Parsing, Validation, Net Module, Networking

Description: Parse and validate IPv6 addresses in Node.js using the built-in net module, parse CIDRs, handle zone IDs, and validate in Express middleware.

## Basic Validation with net Module

Node.js's `net` module provides `isIPv6()` for simple validation:

```javascript
const net = require('net');

function validateIPv6(addr) {
    return net.isIPv6(addr);
}

const tests = [
    '2001:db8::1',
    '::1',
    '::',
    '2001:0db8:0000:0000:0000:0000:0000:0001',
    '::ffff:192.168.1.1',  // IPv4-mapped
    'fe80::1%eth0',        // with zone ID - accepted in current Node.js
    'not-an-address',
];

for (const addr of tests) {
    console.log(`${addr.padEnd(45)} → ${net.isIPv6(addr)}`);
}
```

## Parsing with URL API (Zone IDs and Brackets)

```javascript
// Parse [2001:db8::1]:8080 format using URL
function parseIPv6SocketAddr(s) {
    try {
        const url = new URL(`tcp://${s}`);
        // url.hostname includes brackets for IPv6; strip them
        const host = url.hostname.replace(/^\[|\]$/g, '');
        return {
            host,
            port: parseInt(url.port, 10),
        };
    } catch {
        return null;
    }
}

const examples = [
    '[2001:db8::1]:8080',
    '[::1]:443',
    '192.168.1.1:80',
];

for (const e of examples) {
    console.log(e, '→', parseIPv6SocketAddr(e));
}
```

## CIDR Parsing

```javascript
// Parse and validate IPv6 CIDR without external dependencies
function parseIPv6CIDR(cidr) {
    const [addr, lenStr] = cidr.split('/');
    const prefixLen = parseInt(lenStr, 10);

    if (!net.isIPv6(addr)) {
        throw new Error(`Invalid IPv6 address: ${addr}`);
    }

    if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 128) {
        throw new Error(`Invalid prefix length: ${lenStr}`);
    }

    return { addr, prefixLen };
}

// Check if an IP is in a CIDR (requires BigInt arithmetic)
function ipv6ToBigInt(addr) {
    // Expand and convert to hex string
    const full = expandIPv6(addr);
    return BigInt('0x' + full.replace(/:/g, ''));
}

function expandIPv6(addr) {
    // Handle :: expansion
    const halves = addr.split('::');
    if (halves.length === 2) {
        const left = halves[0] ? halves[0].split(':') : [];
        const right = halves[1] ? halves[1].split(':') : [];
        const missing = 8 - left.length - right.length;
        const middle = Array(missing).fill('0000');
        return [...left, ...middle, ...right]
            .map(g => g.padStart(4, '0'))
            .join(':');
    }
    return addr.split(':').map(g => g.padStart(4, '0')).join(':');
}

function isInCIDR(ip, cidr) {
    const { addr, prefixLen } = parseIPv6CIDR(cidr);
    const ipBig = ipv6ToBigInt(ip);
    const netBig = ipv6ToBigInt(addr);
    const mask = (BigInt(1) << BigInt(128 - prefixLen)) - BigInt(1);
    return (ipBig & ~mask) === (netBig & ~mask);
}

console.log(isInCIDR('2001:db8::1', '2001:db8::/32'));   // true
console.log(isInCIDR('2001:db9::1', '2001:db8::/32'));   // false
```

## Type-Specific Validators

```javascript
const net = require('net');

function isGlobalUnicast(addr) {
    if (!net.isIPv6(addr)) return false;
    // Global unicast: 2000::/3
    const expanded = expandIPv6(addr);
    const firstByte = parseInt(expanded.slice(0, 2), 16);
    return (firstByte & 0xe0) === 0x20;
}

function isLinkLocal(addr) {
    if (!net.isIPv6(addr)) return false;
    const expanded = expandIPv6(addr);
    const prefix = parseInt(expanded.slice(0, 4), 16);
    return (prefix & 0xffc0) === 0xfe80;
}

function isULA(addr) {
    if (!net.isIPv6(addr)) return false;
    const expanded = expandIPv6(addr);
    const firstByte = parseInt(expanded.slice(0, 2), 16);
    return (firstByte & 0xfe) === 0xfc;
}

const addresses = ['2001:4860::1', 'fe80::1', 'fc00::1', '::1'];
for (const a of addresses) {
    console.log(`${a}: global=${isGlobalUnicast(a)} link-local=${isLinkLocal(a)} ula=${isULA(a)}`);
}
```

## Validation in Express Middleware

```javascript
const express = require('express');
const net = require('net');

const app = express();
app.use(express.json());

function ipv6Validator(field) {
    return (req, res, next) => {
        const value = req.body[field];
        if (!value) {
            return res.status(400).json({ error: `${field} is required` });
        }

        // Strip zone ID if present
        const clean = value.includes('%') ? value.split('%')[0] : value;

        if (!net.isIPv6(clean)) {
            return res.status(400).json({
                error: `${field} must be a valid IPv6 address`,
                received: value,
            });
        }

        req.body[field] = clean;  // Store normalized version
        next();
    };
}

app.post('/register', ipv6Validator('address'), (req, res) => {
    res.json({ registered: req.body.address });
});

app.listen(3000, '::', () => console.log('Validator on [::]:3000'));
```

## Conclusion

Node.js's `net.isIPv6()` provides fast IPv6 validation with no dependencies. For socket address parsing with brackets and ports, the URL API handles `[addr]:port` format - note that `url.hostname` keeps the brackets for IPv6, so strip them if you want the bare address. CIDR membership checks require BigInt arithmetic to handle the 128-bit address space. Zone IDs (the `%ifname` suffix) are accepted by `net.isIPv6()` in current Node.js, but you may still want to strip them for storage normalization. For production CIDR operations, consider the `ip6` or `netmask` npm packages which implement these algorithms reliably.
