# How to Get the Local IPv4 Address in Node.js Programmatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, IPv4, Os module, Networking, Network Interfaces

Description: Learn how to programmatically retrieve the local IPv4 address in Node.js using the os module and network interface enumeration.

## Using os.networkInterfaces()

```javascript
const os = require('os');

function getLocalIPv4Addresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const [name, iface] of Object.entries(interfaces)) {
        for (const addr of iface) {
            // Filter for IPv4, non-internal (not loopback) addresses
            if (addr.family === 'IPv4' && !addr.internal) {
                addresses.push({
                    interface: name,
                    ip: addr.address,
                    netmask: addr.netmask,
                    cidr: addr.cidr,
                    mac: addr.mac,
                });
            }
        }
    }

    return addresses;
}

const addrs = getLocalIPv4Addresses();
console.log('Local IPv4 addresses:');
addrs.forEach(a => {
    console.log(`  ${a.interface}: ${a.ip} (${a.cidr}) mac=${a.mac}`);
});
```

## Get the Primary IPv4 Address

```javascript
const os = require('os');

function getPrimaryIPv4() {
    const interfaces = os.networkInterfaces();

    // Priority: eth0/en0 > other non-loopback interfaces
    const preferredNames = ['eth0', 'en0', 'ens3', 'enp0s3'];

    for (const name of preferredNames) {
        const iface = interfaces[name];
        if (iface) {
            for (const addr of iface) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    return addr.address;
                }
            }
        }
    }

    // Fallback: first non-loopback IPv4
    for (const iface of Object.values(interfaces)) {
        for (const addr of iface) {
            if (addr.family === 'IPv4' && !addr.internal) {
                return addr.address;
            }
        }
    }

    return '127.0.0.1';  // Last resort: loopback
}

console.log(`Primary IPv4: ${getPrimaryIPv4()}`);
```

## Including Loopback in Results

```javascript
const os = require('os');

function getAllIPv4Addresses(includeLoopback = false) {
    const interfaces = os.networkInterfaces();
    const result = {};

    for (const [name, iface] of Object.entries(interfaces)) {
        const ipv4s = iface.filter(a =>
            a.family === 'IPv4' && (includeLoopback || !a.internal)
        );
        if (ipv4s.length > 0) {
            result[name] = ipv4s.map(a => a.address);
        }
    }

    return result;
}

console.log(getAllIPv4Addresses(true));
// { lo: ['127.0.0.1'], eth0: ['192.168.1.50'], ... }
```

## Address Change Detection

```javascript
const os = require('os');

function getCurrentIPv4Set() {
    const result = new Set();
    for (const iface of Object.values(os.networkInterfaces())) {
        for (const addr of iface) {
            if (addr.family === 'IPv4' && !addr.internal) {
                result.add(addr.address);
            }
        }
    }
    return result;
}

// Start with the current state so the first interval only reports changes.
let previousAddresses = getCurrentIPv4Set();

// Check for network interface changes every 5 seconds
setInterval(() => {
    const current = getCurrentIPv4Set();

    const added = [...current].filter(ip => !previousAddresses.has(ip));
    const removed = [...previousAddresses].filter(ip => !current.has(ip));

    if (added.length > 0) console.log(`New IPs: ${added.join(', ')}`);
    if (removed.length > 0) console.log(`Removed IPs: ${removed.join(', ')}`);

    previousAddresses = current;
}, 5000);
```

## Interface Details Reference

| Property | Description |
|----------|-------------|
| `address` | IPv4 address string |
| `netmask` | Subnet mask (e.g., `255.255.255.0`) |
| `family` | `'IPv4'` or `'IPv6'` |
| `mac` | MAC address |
| `internal` | `true` for loopback or similar non-remotely-accessible interfaces |
| `cidr` | CIDR notation (e.g., `192.168.1.50/24`), or `null` if the netmask is invalid |

## Conclusion

`os.networkInterfaces()` is the standard Node.js API for discovering local IPv4 addresses. Filter by `family === 'IPv4'` and `!internal` to get non-loopback addresses. Use interface name priorities for deterministic primary IP selection in multi-interface environments.
