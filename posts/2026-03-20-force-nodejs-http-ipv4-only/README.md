# How to Force Node.js HTTP Requests to Use IPv4 Only

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, HTTP, IPv4, Http.Agent, Networking, Dual-Stack

Description: Learn how to force Node.js HTTP and HTTPS requests to use IPv4 only, avoiding IPv6 resolution in dual-stack environments.

## The Dual-Stack Problem

On dual-stack systems (IPv4 and IPv6), Node.js may prefer IPv6 when resolving hostnames. If your infrastructure or firewall only supports IPv4, or you want predictable routing, forcing IPv4 is important.

## Method 1: Set family in http.Agent

```javascript
const http = require('http');
const https = require('https');

// Create an IPv4-only HTTP agent
const ipv4HttpAgent = new http.Agent({
    family: 4,      // Force IPv4; use 6 for IPv6
});

const ipv4HttpsAgent = new https.Agent({
    family: 4,
});

// Use the agent in a request
const options = {
    hostname: 'api.example.com',
    port: 80,
    path: '/data',
    method: 'GET',
    agent: ipv4HttpAgent,
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`Response (${res.statusCode}): ${data}`);
    });
});

req.on('error', console.error);
req.end();
```

## Method 2: Using axios with IPv4 Agent

```javascript
const axios = require('axios');
const https = require('https');
const http = require('http');

// Create a custom axios instance that forces IPv4
const axiosIPv4 = axios.create({
    httpAgent: new http.Agent({ family: 4 }),
    httpsAgent: new https.Agent({ family: 4 }),
});

async function fetchIPv4Only(url) {
    const response = await axiosIPv4.get(url);
    return response.data;
}

fetchIPv4Only('https://api.example.com/status')
    .then(data => console.log(data))
    .catch(err => console.error(err.message));
```

## Method 3: Global Default Agent

```javascript
const http = require('http');
const https = require('https');

// Override the global default agents for requests that use the default agent
http.globalAgent = new http.Agent({ family: 4 });
https.globalAgent = new https.Agent({ family: 4 });

// Now http/https requests that use the default global agent will resolve hostnames to IPv4
const axios = require('axios');
axios.get('https://api.example.com/').then(r => console.log(r.status));
```

## Method 4: Manual DNS Resolution to IPv4

```javascript
const dns = require('dns/promises');
const https = require('https');

async function fetchWithIPv4DNS(hostname, path) {
    // Resolve to IPv4 explicitly
    const [ipv4] = await dns.resolve4(hostname);

    return new Promise((resolve, reject) => {
        const options = {
            host: ipv4,           // Connect to the IPv4 address directly
            port: 443,
            path,
            servername: hostname, // Send the original hostname in TLS SNI
            headers: {
                Host: hostname,   // Keep the HTTP Host header set to the original hostname
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });

        req.on('error', reject);
        req.end();
    });
}

fetchWithIPv4DNS('api.example.com', '/health')
    .then(({ status, data }) => console.log(`Status ${status}: ${data}`))
    .catch(console.error);
```

## Method 5: Node.js Environment Variable

This changes the default address order for `dns.lookup()`, but it does not strictly force IPv4-only connections the way `family: 4` does.

```bash
# Prefer IPv4 in dns.lookup() process-wide

NODE_OPTIONS="--dns-result-order=ipv4first" node app.js
```

Or in code:

```javascript
// dns.setDefaultResultOrder is available in Node.js 16.4+ (and 14.18+)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
```

## Confirming IPv4 is Used

```javascript
const https = require('https');

const agent = new https.Agent({ family: 4 });
const req = https.request({ hostname: 'example.com', agent }, (res) => {
    console.log(`Connected to: ${res.socket.remoteAddress}`);
    // Should print an IPv4 address
    res.resume();
});
req.end();
```

## Conclusion

The most reliable way to force IPv4-only HTTP requests in Node.js is to pass `family: 4` to `http.Agent` or `https.Agent`. For a process-wide default, override `http.globalAgent` and `https.globalAgent`. `dns.setDefaultResultOrder('ipv4first')` provides a process-wide preference without custom agents, but it does not strictly force IPv4-only connections.
