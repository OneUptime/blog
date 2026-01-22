# How to Fix 'Error: ENOTFOUND' in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Node.js, Error Handling, DNS, Networking, Debugging

Description: Learn how to diagnose and fix the ENOTFOUND error in Node.js applications, which occurs when DNS resolution fails for a hostname.

---

The `ENOTFOUND` error occurs when Node.js cannot resolve a hostname to an IP address through DNS. This typically indicates network issues, incorrect hostnames, or DNS configuration problems. Let's explore how to fix this error.

## Understanding ENOTFOUND

```javascript
// Example error
{
  code: 'ENOTFOUND',
  errno: 'ENOTFOUND',
  syscall: 'getaddrinfo',
  hostname: 'api.example.com'
}
```

This error means the DNS lookup failed to find the specified hostname.

## Common Causes

1. Typo in hostname
2. DNS server issues
3. Network connectivity problems
4. Hostname doesn't exist
5. Firewall blocking DNS
6. Local DNS cache issues

## Solution 1: Validate Hostname

```javascript
const dns = require('dns');
const url = require('url');

// Validate hostname before making request
async function validateHostname(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, address, family) => {
      if (err) {
        reject(new Error(`Cannot resolve hostname: ${hostname}`));
      } else {
        resolve({ address, family });
      }
    });
  });
}

// Usage
async function makeRequest(urlString) {
  const parsedUrl = new URL(urlString);
  
  try {
    // Validate hostname first
    await validateHostname(parsedUrl.hostname);
    
    // Proceed with request
    const response = await fetch(urlString);
    return response.json();
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.error(`DNS lookup failed for: ${parsedUrl.hostname}`);
      console.error('Please check the hostname spelling and network connection');
    }
    throw error;
  }
}
```

## Solution 2: DNS Resolution with Fallback

```javascript
const dns = require('dns');

// Try multiple DNS resolution methods
async function resolveHostname(hostname) {
  const methods = [
    () => dnsLookup(hostname),
    () => dnsResolve4(hostname),
    () => dnsResolve6(hostname)
  ];
  
  for (const method of methods) {
    try {
      const result = await method();
      return result;
    } catch (error) {
      console.log(`Resolution method failed: ${error.message}`);
    }
  }
  
  throw new Error(`All DNS resolution methods failed for: ${hostname}`);
}

function dnsLookup(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses);
    });
  });
}

function dnsResolve4(hostname) {
  return new Promise((resolve, reject) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses.map(addr => ({ address: addr, family: 4 })));
    });
  });
}

function dnsResolve6(hostname) {
  return new Promise((resolve, reject) => {
    dns.resolve6(hostname, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses.map(addr => ({ address: addr, family: 6 })));
    });
  });
}
```

## Solution 3: Custom DNS Servers

```javascript
const dns = require('dns');
const { Resolver } = require('dns');

// Create resolver with custom DNS servers
const resolver = new Resolver();
resolver.setServers([
  '8.8.8.8',        // Google DNS
  '8.8.4.4',        // Google DNS secondary
  '1.1.1.1',        // Cloudflare DNS
  '208.67.222.222'  // OpenDNS
]);

async function resolveWithCustomDNS(hostname) {
  return new Promise((resolve, reject) => {
    resolver.resolve4(hostname, (err, addresses) => {
      if (err) {
        console.error('Custom DNS resolution failed:', err);
        reject(err);
      } else {
        console.log(`Resolved ${hostname} to:`, addresses);
        resolve(addresses);
      }
    });
  });
}

// Usage
async function makeRequestWithCustomDNS(url) {
  const hostname = new URL(url).hostname;
  
  try {
    const addresses = await resolveWithCustomDNS(hostname);
    console.log(`Using IP: ${addresses[0]}`);
    
    // Make request using resolved IP
    const response = await fetch(url);
    return response.json();
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.error('Hostname not found even with custom DNS servers');
    }
    throw error;
  }
}
```

## Solution 4: Request with Retry and DNS Fallback

```javascript
const axios = require('axios');
const dns = require('dns');
const https = require('https');

// Create axios instance with custom DNS
function createClientWithDNSFallback() {
  const customDNSServers = ['8.8.8.8', '1.1.1.1'];
  let currentDNSIndex = 0;
  
  const client = axios.create({
    timeout: 30000
  });
  
  // Retry interceptor
  client.interceptors.response.use(
    response => response,
    async error => {
      if (error.code === 'ENOTFOUND') {
        // Try with next DNS server
        if (currentDNSIndex < customDNSServers.length) {
          console.log(`Trying DNS server: ${customDNSServers[currentDNSIndex]}`);
          
          dns.setServers([customDNSServers[currentDNSIndex]]);
          currentDNSIndex++;
          
          // Retry the request
          return client.request(error.config);
        }
      }
      
      return Promise.reject(error);
    }
  );
  
  return client;
}

const client = createClientWithDNSFallback();

async function fetchData(url) {
  try {
    const response = await client.get(url);
    return response.data;
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.error('Could not resolve hostname with any DNS server');
    }
    throw error;
  }
}
```

## Solution 5: Handle Offline/Network Issues

```javascript
const dns = require('dns');
const os = require('os');

// Check network connectivity
function checkNetworkConnection() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal/loopback interfaces
      if (!iface.internal && iface.family === 'IPv4') {
        return true;
      }
    }
  }
  
  return false;
}

// Check DNS connectivity
async function checkDNSConnectivity() {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      resolve(!err);
    });
  });
}

// Diagnose connection issues
async function diagnoseConnection() {
  const results = {
    hasNetwork: checkNetworkConnection(),
    canResolveDNS: await checkDNSConnectivity(),
    dnsServers: dns.getServers()
  };
  
  console.log('Connection Diagnostics:');
  console.log('- Network interface available:', results.hasNetwork);
  console.log('- DNS resolution working:', results.canResolveDNS);
  console.log('- DNS servers:', results.dnsServers);
  
  if (!results.hasNetwork) {
    console.log('\nProblem: No network connection');
    console.log('Solution: Check your internet connection');
  } else if (!results.canResolveDNS) {
    console.log('\nProblem: DNS resolution not working');
    console.log('Solution: Try changing DNS servers');
  }
  
  return results;
}
```

## Solution 6: Environment-specific Hostname Configuration

```javascript
// config.js
const config = {
  development: {
    apiHost: process.env.API_HOST || 'localhost',
    apiPort: process.env.API_PORT || 3000
  },
  staging: {
    apiHost: process.env.API_HOST || 'staging-api.example.com',
    apiPort: 443
  },
  production: {
    apiHost: process.env.API_HOST || 'api.example.com',
    apiPort: 443
  }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];

// api-client.js
const config = require('./config');
const axios = require('axios');

const apiClient = axios.create({
  baseURL: `https://${config.apiHost}:${config.apiPort}`,
  timeout: 30000
});

// Validate configuration on startup
async function validateConfig() {
  const dns = require('dns');
  
  return new Promise((resolve, reject) => {
    dns.lookup(config.apiHost, (err, address) => {
      if (err) {
        console.error(`Cannot resolve API host: ${config.apiHost}`);
        console.error('Check your environment configuration');
        reject(err);
      } else {
        console.log(`API host ${config.apiHost} resolves to ${address}`);
        resolve(address);
      }
    });
  });
}

module.exports = { apiClient, validateConfig };
```

## Solution 7: Graceful Error Handling

```javascript
const axios = require('axios');

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.client = axios.create({ baseURL, timeout: 30000 });
  }
  
  async request(config) {
    try {
      return await this.client.request(config);
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  handleError(error) {
    if (error.code === 'ENOTFOUND') {
      const hostname = new URL(this.baseURL).hostname;
      
      return new Error(
        `Unable to connect to ${hostname}. ` +
        'Please check:\n' +
        '1. The hostname is spelled correctly\n' +
        '2. You have internet connectivity\n' +
        '3. DNS servers are responding\n' +
        '4. The service is available'
      );
    }
    
    if (error.code === 'ECONNREFUSED') {
      return new Error('Connection refused. The server may be down.');
    }
    
    if (error.code === 'ETIMEDOUT') {
      return new Error('Connection timed out. Network may be slow.');
    }
    
    return error;
  }
  
  async get(path) {
    return this.request({ method: 'GET', url: path });
  }
  
  async post(path, data) {
    return this.request({ method: 'POST', url: path, data });
  }
}

// Usage
const api = new ApiClient('https://api.example.com');

async function fetchUsers() {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    // User-friendly error message
    console.error(error.message);
  }
}
```

## Solution 8: Local Hosts File Check

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

// Check if hostname is in local hosts file
function checkLocalHosts(hostname) {
  const hostsPath = os.platform() === 'win32'
    ? 'C:\\Windows\\System32\\drivers\\etc\\hosts'
    : '/etc/hosts';
  
  try {
    const hostsContent = fs.readFileSync(hostsPath, 'utf8');
    const lines = hostsContent.split('\n');
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.trim()) continue;
      
      const parts = line.split(/\s+/);
      const hosts = parts.slice(1);
      
      if (hosts.includes(hostname)) {
        return {
          found: true,
          ip: parts[0],
          line: line
        };
      }
    }
    
    return { found: false };
  } catch (error) {
    console.error('Could not read hosts file:', error.message);
    return { found: false, error: error.message };
  }
}

// Usage in error handling
async function resolveWithLocalFallback(hostname) {
  const dns = require('dns');
  
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, address) => {
      if (err && err.code === 'ENOTFOUND') {
        // Check local hosts file
        const localResult = checkLocalHosts(hostname);
        
        if (localResult.found) {
          console.log(`Found ${hostname} in local hosts: ${localResult.ip}`);
          resolve(localResult.ip);
        } else {
          console.log('Hostname not found in DNS or local hosts file');
          reject(err);
        }
      } else if (err) {
        reject(err);
      } else {
        resolve(address);
      }
    });
  });
}
```

## Debugging DNS Issues

```javascript
const dns = require('dns');

async function debugDNS(hostname) {
  console.log(`\n=== DNS Debug for ${hostname} ===\n`);
  
  // Check current DNS servers
  console.log('DNS Servers:', dns.getServers());
  
  // Try different resolution methods
  const tests = [
    {
      name: 'dns.lookup',
      fn: () => new Promise((resolve, reject) => {
        dns.lookup(hostname, { all: true }, (err, addresses) => {
          if (err) reject(err);
          else resolve(addresses);
        });
      })
    },
    {
      name: 'dns.resolve4',
      fn: () => new Promise((resolve, reject) => {
        dns.resolve4(hostname, (err, addresses) => {
          if (err) reject(err);
          else resolve(addresses);
        });
      })
    },
    {
      name: 'dns.resolveAny',
      fn: () => new Promise((resolve, reject) => {
        dns.resolveAny(hostname, (err, records) => {
          if (err) reject(err);
          else resolve(records);
        });
      })
    }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      console.log(`${test.name}: SUCCESS`);
      console.log('  Result:', result);
    } catch (error) {
      console.log(`${test.name}: FAILED`);
      console.log(`  Error: ${error.code} - ${error.message}`);
    }
  }
}

// Run diagnostics
debugDNS('api.example.com');
```

## Summary

| Cause | Solution |
|-------|----------|
| Typo in hostname | Double-check URL spelling |
| DNS server issues | Use custom DNS servers (8.8.8.8, 1.1.1.1) |
| Network disconnected | Check internet connection |
| Local DNS cache | Clear DNS cache or wait |
| Firewall blocking | Check firewall settings |
| Service not registered | Verify domain exists |

| Method | Use Case |
|--------|----------|
| `dns.lookup()` | Uses OS resolver, respects /etc/hosts |
| `dns.resolve4()` | Direct DNS query for IPv4 |
| `dns.resolve6()` | Direct DNS query for IPv6 |
| Custom Resolver | Bypass system DNS |

The `ENOTFOUND` error is often a configuration issue. Always validate hostnames early and provide helpful error messages to users about what might be wrong.
