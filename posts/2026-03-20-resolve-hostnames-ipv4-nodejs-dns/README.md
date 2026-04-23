# How to Resolve Hostnames to IPv4 Addresses in Node.js Using dns Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, DNS, IPv4, Hostname Resolution, Dns module, Networking

Description: Learn how to resolve hostnames to IPv4 addresses in Node.js using the dns module, including A record lookups, custom DNS servers, and async/await patterns.

## Basic DNS Resolution

```javascript
const dns = require('dns');

// dns.lookup uses the OS resolver (getaddrinfo)
dns.lookup('google.com', { family: 4 }, (err, address, family) => {
    if (err) {
        console.error(`Lookup error: ${err.message}`);
        return;
    }
    console.log(`google.com -> ${address} (IPv${family})`);
});
```

## Resolving All A Records

```javascript
const dns = require('dns');

// dns.resolve4 queries the DNS server directly for A records
dns.resolve4('google.com', (err, addresses) => {
    if (err) {
        console.error(`Error: ${err.message} (code: ${err.code})`);
        return;
    }
    console.log(`google.com A records:`);
    addresses.forEach(ip => console.log(`  ${ip}`));
});
```

## Using Promises API

```javascript
const dns = require('dns/promises');

async function resolveIPv4(hostname) {
    try {
        // resolve4 returns only IPv4 addresses
        const addresses = await dns.resolve4(hostname);
        return addresses;
    } catch (err) {
        if (err.code === 'ENOTFOUND') {
            throw new Error(`Hostname not found: ${hostname}`);
        }
        throw err;
    }
}

async function main() {
    const hosts = ['cloudflare.com', 'github.com', 'nonexistent.invalid'];

    for (const host of hosts) {
        try {
            const ips = await resolveIPv4(host);
            console.log(`${host} -> ${ips.join(', ')}`);
        } catch (err) {
            console.error(`${host}: ${err.message}`);
        }
    }
}

main();
```

## Reverse DNS Lookup

```javascript
const dns = require('dns/promises');

async function reverseLookup(ip) {
    try {
        const hostnames = await dns.reverse(ip);
        return hostnames;
    } catch (err) {
        return [];
    }
}

async function main() {
    const ips = ['8.8.8.8', '1.1.1.1', '208.67.222.222'];
    for (const ip of ips) {
        const hostnames = await reverseLookup(ip);
        console.log(`${ip} -> ${hostnames.join(', ') || 'no PTR record'}`);
    }
}

main();
```

## Custom DNS Server

```javascript
const dns = require('dns');

// Create a resolver using a custom DNS server
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);  // Google and Cloudflare DNS

resolver.resolve4('example.com', (err, addresses) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Resolved via custom DNS: ${addresses}`);
});
```

## Resolving with TTL Information

```javascript
const dns = require('dns/promises');

async function resolveWithTTL(hostname) {
    // ttl: true returns objects with address and ttl fields
    const records = await dns.resolve4(hostname, { ttl: true });
    records.forEach(r => {
        console.log(`  ${r.address} (TTL: ${r.ttl}s)`);
    });
}

resolveWithTTL('github.com').catch(console.error);
```

## Bulk Resolution with Promise.all

```javascript
const dns = require('dns/promises');

async function resolveAll(hostnames) {
    const results = await Promise.allSettled(
        hostnames.map(async (h) => ({
            hostname: h,
            ips: await dns.resolve4(h),
        }))
    );

    return results.map(r => {
        if (r.status === 'fulfilled') return r.value;
        return { hostname: r.reason.hostname, ips: [], error: r.reason.message };
    });
}

resolveAll(['google.com', 'github.com', 'invalid.test']).then(results => {
    results.forEach(r => {
        console.log(`${r.hostname}: ${r.ips?.join(', ') || r.error}`);
    });
});
```

## Conclusion

Node.js provides two DNS resolution paths: `dns.lookup()` (uses OS resolver, returns one address) and `dns.resolve4()` (queries DNS directly, returns all A records). Use `dns.resolve4()` for DNS protocol A-record lookups and multiple addresses. The `dns/promises` API with async/await is the modern approach. Use `dns.Resolver` for custom DNS server configuration.
