# How to Fix "Error: EHOSTUNREACH" in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Networking, Debugging, Troubleshooting, DevOps

Description: Diagnose and resolve EHOSTUNREACH network errors in Node.js applications by checking connectivity, DNS resolution, firewall rules, and implementing proper retry logic.

---

The EHOSTUNREACH error means Node.js cannot establish a network connection to the target host. The host is either unreachable from your network, the routing is broken, or a firewall is blocking the connection. Here is how to diagnose and fix it.

## Understanding the Error

When you see this error:

```
Error: connect EHOSTUNREACH 192.168.1.100:3000
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)
```

It means the network path to the destination does not exist or is blocked. This is different from ECONNREFUSED (host reachable but port closed) or ETIMEDOUT (connection attempt took too long).

## Quick Diagnosis

First, check if the host is reachable from your system:

```bash
# Test basic connectivity
ping 192.168.1.100

# Test specific port
nc -zv 192.168.1.100 3000

# Check route to host
traceroute 192.168.1.100  # Linux/macOS
tracert 192.168.1.100     # Windows

# Check if DNS resolves
nslookup api.example.com
dig api.example.com
```

## Common Causes and Fixes

### 1. Wrong IP Address or Hostname

```javascript
// Problem - typo or wrong address
const response = await fetch('http://192.168.1.100:3000/api');

// Fix - verify the address
const HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.API_PORT || 3000;

console.log(`Connecting to ${HOST}:${PORT}`);

const response = await fetch(`http://${HOST}:${PORT}/api`);
```

### 2. DNS Resolution Failure

```javascript
const dns = require('dns');

// Check if hostname resolves
function checkDns(hostname) {
    return new Promise((resolve, reject) => {
        dns.lookup(hostname, (err, address, family) => {
            if (err) {
                reject(new Error(`DNS lookup failed for ${hostname}: ${err.message}`));
            } else {
                resolve({ address, family });
            }
        });
    });
}

async function connectWithDnsCheck(hostname, port) {
    try {
        const { address } = await checkDns(hostname);
        console.log(`${hostname} resolved to ${address}`);

        const response = await fetch(`http://${hostname}:${port}/api`);
        return response;
    } catch (error) {
        if (error.message.includes('DNS lookup failed')) {
            console.error('DNS Error: Check /etc/hosts or DNS settings');
        }
        throw error;
    }
}
```

### 3. Docker Networking Issues

Containers cannot reach host machine by localhost:

```javascript
// Problem - from inside Docker
const response = await fetch('http://localhost:3000/api');  // EHOSTUNREACH

// Fix - use host.docker.internal (Docker Desktop)
const response = await fetch('http://host.docker.internal:3000/api');

// Or use the actual host IP
const response = await fetch('http://172.17.0.1:3000/api');  // Docker bridge IP
```

Docker Compose networking:

```yaml
# docker-compose.yml
services:
  app:
    build: .
    depends_on:
      - api
    environment:
      - API_URL=http://api:3000  # Use service name

  api:
    build: ./api
    ports:
      - "3000:3000"
```

```javascript
// Use the service name
const API_URL = process.env.API_URL || 'http://api:3000';
const response = await fetch(`${API_URL}/endpoint`);
```

### 4. Kubernetes Service Discovery

```javascript
// Problem - hardcoded IP that does not exist in cluster
const response = await fetch('http://192.168.1.100:3000/api');

// Fix - use Kubernetes service name
// Format: http://<service-name>.<namespace>.svc.cluster.local:<port>
const API_URL = process.env.API_URL || 'http://my-api.default.svc.cluster.local:3000';
const response = await fetch(`${API_URL}/api`);

// Or just the service name if in same namespace
const API_URL = process.env.API_URL || 'http://my-api:3000';
```

### 5. VPN or Network Configuration

When a VPN changes your routing:

```javascript
const http = require('http');

// Create agent that binds to specific interface
const agent = new http.Agent({
    localAddress: '10.0.0.5',  // Your local IP on the correct interface
    keepAlive: true
});

const response = await fetch('http://api.internal:3000/endpoint', { agent });
```

### 6. Firewall Blocking

Check if firewall is blocking:

```bash
# Check iptables (Linux)
sudo iptables -L -n

# Check firewalld (RHEL/CentOS)
sudo firewall-cmd --list-all

# Check UFW (Ubuntu)
sudo ufw status

# macOS
sudo pfctl -s rules
```

Allow the connection:

```bash
# iptables
sudo iptables -A OUTPUT -d 192.168.1.100 -p tcp --dport 3000 -j ACCEPT

# UFW
sudo ufw allow out to 192.168.1.100 port 3000

# firewalld
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

## Implementing Retry Logic

Network issues can be transient. Add retries:

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    const { retryDelay = 1000, backoffMultiplier = 2 } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            lastError = error;

            // Only retry on network errors
            if (error.code === 'EHOSTUNREACH' ||
                error.code === 'ECONNREFUSED' ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'ENOTFOUND') {

                if (attempt < maxRetries) {
                    const delay = retryDelay * Math.pow(backoffMultiplier, attempt - 1);
                    console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
            }

            throw error;
        }
    }

    throw lastError;
}

// Usage
try {
    const response = await fetchWithRetry('http://api.example.com:3000/data', {
        retryDelay: 1000,
        backoffMultiplier: 2
    }, 3);
    console.log('Success:', await response.json());
} catch (error) {
    console.error('All retries failed:', error.message);
}
```

## Health Check with Fallback

```javascript
const http = require('http');

class ApiClient {
    constructor(endpoints) {
        this.endpoints = endpoints;  // Array of URLs
        this.currentIndex = 0;
    }

    async checkHealth(url) {
        return new Promise((resolve) => {
            const req = http.get(`${url}/health`, { timeout: 2000 }, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    async getHealthyEndpoint() {
        for (let i = 0; i < this.endpoints.length; i++) {
            const index = (this.currentIndex + i) % this.endpoints.length;
            const endpoint = this.endpoints[index];

            if (await this.checkHealth(endpoint)) {
                this.currentIndex = index;
                return endpoint;
            }
        }

        throw new Error('No healthy endpoints available');
    }

    async request(path, options = {}) {
        const endpoint = await this.getHealthyEndpoint();
        const response = await fetch(`${endpoint}${path}`, options);
        return response;
    }
}

// Usage
const client = new ApiClient([
    'http://api1.example.com:3000',
    'http://api2.example.com:3000',
    'http://api3.example.com:3000'
]);

const data = await client.request('/users');
```

## Debugging Connection Issues

Add detailed logging:

```javascript
const http = require('http');

function createDebugAgent() {
    const agent = new http.Agent({ keepAlive: true });

    const originalCreateConnection = agent.createConnection.bind(agent);

    agent.createConnection = function(options, callback) {
        console.log('Creating connection to:', {
            host: options.host,
            port: options.port,
            localAddress: options.localAddress
        });

        const socket = originalCreateConnection(options, callback);

        socket.on('connect', () => {
            console.log('Socket connected:', socket.remoteAddress);
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err.message, err.code);
        });

        socket.on('close', () => {
            console.log('Socket closed');
        });

        return socket;
    };

    return agent;
}

// Use the debug agent
const agent = createDebugAgent();
const response = await fetch('http://api.example.com:3000/test', { agent });
```

## Environment-Specific Configuration

```javascript
// config.js
const config = {
    development: {
        apiUrl: 'http://localhost:3000',
        timeout: 5000
    },
    docker: {
        apiUrl: 'http://host.docker.internal:3000',
        timeout: 5000
    },
    kubernetes: {
        apiUrl: process.env.API_SERVICE_URL || 'http://api-service:3000',
        timeout: 10000
    },
    production: {
        apiUrl: process.env.API_URL,
        timeout: 30000
    }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
```

## Summary

EHOSTUNREACH means the network cannot route to the destination. Check the hostname/IP is correct, DNS resolves properly, firewalls allow the connection, and your network configuration (especially in Docker/Kubernetes) is right. Implement retry logic for transient failures and use health checks with fallback endpoints for high availability. When debugging, use ping, traceroute, and socket-level logging to identify where the connection fails.
