# How to Use the Node.js dns Module with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, IPv6, DNS, AAAA, PTR, Dns module, Networking

Description: Perform IPv6 DNS operations in Node.js including AAAA record lookups, reverse PTR queries, controlling resolution order, and using the dns/promises API.

## AAAA Record Lookup

```javascript
const dns = require('dns/promises');

async function lookupAAAA(hostname) {
    try {
        // resolve6 returns only AAAA records
        const addresses = await dns.resolve6(hostname);
        console.log(`AAAA for ${hostname}:`);
        addresses.forEach(a => console.log(`  ${a}`));
        return addresses;
    } catch (err) {
        console.error(`No AAAA for ${hostname}: ${err.message}`);
        return [];
    }
}

// lookup uses the OS resolver; family: 6 limits results to IPv6
async function lookupIPv6(hostname) {
    const result = await dns.lookup(hostname, { family: 6 });
    console.log(`Lookup (IPv6): ${result.address}`);
    return result;
}

(async () => {
    await lookupAAAA('ipv6.google.com');
    await lookupAAAA('example.com');
})();
```

## PTR Reverse Lookup

```javascript
const dns = require('dns/promises');

async function reverseLookup(ipv6Addr) {
    try {
        const hostnames = await dns.reverse(ipv6Addr);
        console.log(`PTR for ${ipv6Addr}:`, hostnames);
        return hostnames;
    } catch (err) {
        if (err.code === 'ENOTFOUND') {
            console.log(`No PTR for ${ipv6Addr}`);
        } else {
            console.error(`Reverse lookup error: ${err.message}`);
        }
        return [];
    }
}

function buildPTRName(ipv6Addr) {
    // Expand the IPv6 address to full form for PTR name
    const expanded = ipv6Addr.replace('::', (match, offset, str) => {
        const count = 8 - (str.match(/:/g) || []).length;
        return ':' + ':0'.repeat(count).slice(1) + ':';
    });

    const parts = expanded.split(':');
    const nibbles = parts
        .map(p => p.padStart(4, '0'))
        .join('')
        .split('')
        .reverse()
        .join('.');

    return `${nibbles}.ip6.arpa`;
}

(async () => {
    await reverseLookup('2001:4860:4860::8888');
    console.log('PTR name:', buildPTRName('2001:4860:4860::8888'));
})();
```

## Controlling IPv6/IPv4 Resolution Order

```javascript
const dns = require('dns');

// Set order: 'verbatim' preserves resolver order, 'ipv4first' returns IPv4 first
// Node.js 17+ default is 'verbatim', earlier versions default to 'ipv4first'
dns.setDefaultResultOrder('verbatim');

const dnsPromises = require('dns/promises');

async function lookupAll(hostname) {
    // Get all addresses regardless of family
    const results = await dnsPromises.lookup(hostname, { all: true });
    console.log(`All addresses for ${hostname}:`);
    results.forEach(({ address, family }) => {
        console.log(`  IPv${family}: ${address}`);
    });

    // Prefer IPv6
    const v6 = results.find(r => r.family === 6);
    const v4 = results.find(r => r.family === 4);
    const preferred = v6 || v4;
    console.log(`Preferred: ${preferred?.address} (IPv${preferred?.family})`);
}

(async () => {
    await lookupAll('example.com');
})();
```

## Custom DNS Resolver

```javascript
const { Resolver } = require('dns/promises');

async function queryWithCustomServer(hostname) {
    const resolver = new Resolver();

    // Use IPv6 DNS servers
    resolver.setServers([
        '2001:4860:4860::8888',     // Google Public DNS over IPv6
        '2620:fe::fe',              // Quad9 over IPv6
    ]);

    try {
        const aaaa = await resolver.resolve6(hostname);
        console.log(`AAAA (via IPv6 DNS): ${aaaa}`);
        return aaaa;
    } catch (err) {
        console.error(`Error: ${err.message}`);
        return [];
    }
}

async function dnsLookupWithTimeout(hostname, timeoutMs) {
    const resolver = new Resolver({ timeout: timeoutMs });
    resolver.setServers(['2001:4860:4860::8888']);
    const timer = setTimeout(() => resolver.cancel(), timeoutMs);

    try {
        const result = await resolver.resolve6(hostname);
        clearTimeout(timer);
        return result;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

(async () => {
    await queryWithCustomServer('ipv6.google.com');
    const addrs = await dnsLookupWithTimeout('example.com', 3000);
    console.log('With timeout:', addrs);
})();
```

## DNS SRV Records with IPv6

```javascript
const dns = require('dns/promises');

async function lookupService(service, proto, domain) {
    const srvName = `_${service}._${proto}.${domain}`;

    try {
        const records = await dns.resolveSrv(srvName);
        console.log(`SRV records for ${srvName}:`);

        for (const record of records) {
            console.log(`  ${record.name}:${record.port} (priority=${record.priority})`);

            // Resolve target to IPv6
            try {
                const addrs = await dns.resolve6(record.name);
                console.log(`    AAAA: ${addrs.join(', ')}`);
            } catch {
                console.log('    No AAAA record');
            }
        }
    } catch (err) {
        console.error(`SRV lookup failed: ${err.message}`);
    }
}

(async () => {
    await lookupService('xmpp-server', 'tcp', 'jabber.org');
})();
```

## Conclusion

Node.js's `dns/promises` API provides `resolve6()` for AAAA queries and `reverse()` for PTR lookups. The `Resolver` class allows per-query DNS server configuration, useful for testing against IPv6-capable resolvers. Set the default resolution order with `dns.setDefaultResultOrder('verbatim')` to preserve resolver-returned order rather than preferring IPv4. In `setServers()`, Node accepts RFC 5952 IPv6 literals such as `'2001:db8::1'`; when you specify a custom port, use bracketed form such as `'[2001:db8::1]:1053'`. Node 17+ changed the default ordering to `'verbatim'`.
