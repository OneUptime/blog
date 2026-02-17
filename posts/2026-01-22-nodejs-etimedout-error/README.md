# How to Fix 'Error: ETIMEDOUT' in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Error, Networking, HTTP, Debugging

Description: Learn how to diagnose and fix ETIMEDOUT errors in Node.js when making HTTP requests, database connections, or socket operations.

---

The ETIMEDOUT error occurs when a connection attempt or request takes too long and the system terminates it. This typically happens with network operations, HTTP requests, or database connections.

## Understanding ETIMEDOUT

```
Error: connect ETIMEDOUT 93.184.216.34:443
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)
```

This error indicates that the connection attempt to the remote server timed out before it could be established.

## Common Causes

1. Remote server is unreachable or down
2. Network connectivity issues
3. Firewall blocking the connection
4. DNS resolution problems
5. High latency network
6. Server overloaded and not accepting connections

## HTTP Request Solutions

### Axios

```javascript
const axios = require('axios');

// Set timeout globally
const client = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 30000,  // 30 seconds
});

// Per-request timeout
async function fetchData() {
  try {
    const response = await axios.get('/data', {
      timeout: 10000,  // 10 seconds
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('Request timed out');
      // Retry or handle timeout
    }
    throw error;
  }
}
```

### Node.js HTTP Module

```javascript
const http = require('http');
const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, {
      ...options,
      timeout: options.timeout || 30000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    // Connection timeout
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.on('error', (error) => {
      if (error.code === 'ETIMEDOUT') {
        reject(new Error('Connection timed out'));
      } else {
        reject(error);
      }
    });
    
    req.end();
  });
}
```

### Fetch with Timeout

```javascript
async function fetchWithTimeout(url, options = {}) {
  const { timeout = 30000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

// Usage
try {
  const response = await fetchWithTimeout('https://api.example.com/data', {
    timeout: 10000,
  });
  const data = await response.json();
} catch (error) {
  console.error('Request failed:', error.message);
}
```

## Database Connection Solutions

### MySQL

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'mydb',
  
  // Connection timeouts
  connectTimeout: 10000,      // 10 seconds to establish connection
  
  // Pool settings
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  // Keep alive
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

async function query(sql, params) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      console.error('Database connection timed out');
      // Attempt to reconnect or use fallback
    }
    throw error;
  }
}
```

### PostgreSQL

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'mydb',
  
  // Timeouts
  connectionTimeoutMillis: 10000,  // Wait 10s for connection
  idleTimeoutMillis: 30000,        // Close idle connections after 30s
  query_timeout: 30000,            // Query timeout
  
  // Pool settings
  max: 20,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});
```

### MongoDB

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/mydb', {
  // Connection timeout
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  
  // Keep alive
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  
  // Pool settings
  maxPoolSize: 10,
  minPoolSize: 2,
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});
```

### Redis

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  
  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,
  
  // Retry strategy
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  if (err.code === 'ETIMEDOUT') {
    console.error('Redis connection timed out');
  }
});
```

## Retry Logic with Exponential Backoff

```javascript
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    retryOn = ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'],
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = retryOn.includes(error.code) ||
                          error.message.includes('timeout');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
      
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Usage
const data = await withRetry(() => axios.get('https://api.example.com/data'), {
  maxRetries: 5,
  initialDelay: 1000,
});
```

## Connection Pooling

```javascript
const http = require('http');
const https = require('https');

// Create agents with connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

// Use with axios
const axios = require('axios');

const client = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 30000,
});
```

## Health Check Implementation

```javascript
async function checkServerHealth(url, timeout = 5000) {
  try {
    const response = await axios.get(url, {
      timeout,
      validateStatus: (status) => status < 500,
    });
    return {
      healthy: true,
      status: response.status,
      latency: response.headers['x-response-time'],
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.code || error.message,
    };
  }
}

// Periodic health check
async function monitorEndpoint(url) {
  setInterval(async () => {
    const health = await checkServerHealth(url);
    if (!health.healthy) {
      console.warn(`Endpoint ${url} is unhealthy:`, health.error);
      // Alert or switch to fallback
    }
  }, 30000);
}
```

## Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure(error) {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn('Circuit breaker opened');
    }
  }
}

// Usage
const breaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000,
});

async function makeRequest() {
  return breaker.execute(async () => {
    return axios.get('https://api.example.com/data', { timeout: 5000 });
  });
}
```

## Debugging Timeout Issues

### Check Connectivity

```javascript
const dns = require('dns');
const net = require('net');

// Check DNS resolution
function checkDNS(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, address) => {
      if (err) {
        console.error(`DNS lookup failed: ${err.message}`);
        reject(err);
      } else {
        console.log(`${hostname} resolved to ${address}`);
        resolve(address);
      }
    });
  });
}

// Check TCP connectivity
function checkPort(host, port, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      console.log(`Port ${port} is open on ${host}`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.error(`Connection to ${host}:${port} timed out`);
      socket.destroy();
      reject(new Error('ETIMEDOUT'));
    });
    
    socket.on('error', (err) => {
      console.error(`Connection error: ${err.message}`);
      reject(err);
    });
    
    socket.connect(port, host);
  });
}

// Diagnose connection
async function diagnoseConnection(url) {
  const parsed = new URL(url);
  
  console.log('Checking DNS...');
  await checkDNS(parsed.hostname);
  
  console.log('Checking port...');
  const port = parsed.port || (parsed.protocol === 'https:' ? 443 : 80);
  await checkPort(parsed.hostname, port);
  
  console.log('Connection looks good!');
}
```

### Log Timeout Details

```javascript
const axios = require('axios');

axios.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});

axios.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata.startTime;
    console.log(`Request to ${response.config.url} took ${duration}ms`);
    return response;
  },
  (error) => {
    if (error.config?.metadata) {
      const duration = Date.now() - error.config.metadata.startTime;
      console.error(`Request failed after ${duration}ms: ${error.code}`);
    }
    return Promise.reject(error);
  }
);
```

## Summary

| Error Code | Meaning |
|------------|---------|
| `ETIMEDOUT` | Connection timed out |
| `ECONNREFUSED` | Connection refused by server |
| `ENOTFOUND` | DNS lookup failed |
| `ECONNRESET` | Connection reset by peer |
| `EPIPE` | Broken pipe (write to closed socket) |

| Solution | When to Use |
|----------|-------------|
| Increase timeout | Slow network or server |
| Retry with backoff | Transient failures |
| Connection pooling | High-volume requests |
| Circuit breaker | Protect from cascading failures |
| Health checks | Monitor endpoint availability |

| Configuration | Recommended Value |
|---------------|-------------------|
| HTTP timeout | 10-30 seconds |
| Database connect | 5-10 seconds |
| Database query | 30-60 seconds |
| Retry attempts | 3-5 |
| Circuit breaker threshold | 3-5 failures |
