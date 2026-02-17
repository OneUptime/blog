# How to Fix 'Error: ECONNRESET' in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Error, Networking, HTTP, Debugging

Description: Learn how to diagnose and fix ECONNRESET errors in Node.js when connections are unexpectedly closed by the server or network.

---

The ECONNRESET error occurs when a TCP connection is abruptly closed by the remote server or a network device. This error means "connection reset by peer" and indicates the connection was forcefully terminated.

## Understanding ECONNRESET

```
Error: read ECONNRESET
    at TCP.onStreamRead (internal/stream_base_commons.js:209:20)
    at TCP.callbackTrampoline (internal/async_hooks.js:134:14)
```

## Common Causes

1. Server crashed or restarted during request
2. Server timeout closed the connection
3. Firewall or proxy terminated the connection
4. Network interruption
5. Keep-alive connection expired
6. Server intentionally closed connection

## HTTP Request Solutions

### Axios with Retry

```javascript
const axios = require('axios');

async function requestWithRetry(config, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios(config);
    } catch (error) {
      lastError = error;
      
      // Check if it's a connection reset error
      const isResetError = 
        error.code === 'ECONNRESET' ||
        error.code === 'EPIPE' ||
        error.code === 'ETIMEDOUT';
      
      if (!isResetError || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Connection reset, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Usage
const response = await requestWithRetry({
  method: 'GET',
  url: 'https://api.example.com/data',
  timeout: 30000,
});
```

### HTTP Agent with Keep-Alive

```javascript
const http = require('http');
const https = require('https');
const axios = require('axios');

// Create agents with proper configuration
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  timeout: 60000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  timeout: 60000,
});

const client = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 30000,
});

// Handle connection errors
client.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNRESET') {
      console.error('Connection was reset');
    }
    return Promise.reject(error);
  }
);
```

### Native HTTP with Error Handling

```javascript
const https = require('https');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';
      
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    });
    
    request.on('error', (error) => {
      if (error.code === 'ECONNRESET') {
        console.error('Connection reset by server');
      }
      reject(error);
    });
    
    // Set timeout
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
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
  
  // Handle connection resets
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  // Keep connections alive
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Handle pool errors
pool.on('error', (err) => {
  if (err.code === 'ECONNRESET') {
    console.error('Database connection was reset');
  }
});

async function query(sql, params) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    if (error.code === 'ECONNRESET') {
      // Retry once on connection reset
      connection = await pool.getConnection();
      const [rows] = await connection.execute(sql, params);
      return rows;
    }
    throw error;
  } finally {
    if (connection) connection.release();
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
  
  // Connection settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err, client) => {
  if (err.code === 'ECONNRESET') {
    console.error('PostgreSQL connection was reset');
  }
});

// Retry wrapper
async function queryWithRetry(sql, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(sql, params);
    } catch (error) {
      if (error.code === 'ECONNRESET' && i < retries - 1) {
        console.log(`Connection reset, retrying (${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

### MongoDB

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/mydb', {
  // Connection settings
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  
  // Keep alive
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  
  // Auto reconnect
  maxPoolSize: 10,
  minPoolSize: 2,
});

mongoose.connection.on('error', (err) => {
  if (err.message.includes('ECONNRESET')) {
    console.error('MongoDB connection was reset');
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
});
```

## Express Server Handling

### Handle Client Disconnects

```javascript
const express = require('express');
const app = express();

app.use((req, res, next) => {
  // Handle client disconnect
  req.on('close', () => {
    if (!res.headersSent) {
      console.log('Client disconnected before response');
    }
  });
  
  next();
});

// Handle connection errors
app.use((err, req, res, next) => {
  if (err.code === 'ECONNRESET') {
    console.log('Client connection reset');
    return;  // Don't send response
  }
  next(err);
});

// For long-running requests
app.get('/long-operation', async (req, res) => {
  let cancelled = false;
  
  req.on('close', () => {
    cancelled = true;
  });
  
  // Check if client disconnected during operation
  for (const chunk of dataChunks) {
    if (cancelled) {
      console.log('Client disconnected, stopping operation');
      return;
    }
    await processChunk(chunk);
  }
  
  if (!cancelled) {
    res.json({ success: true });
  }
});
```

### Global Error Handler

```javascript
process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNRESET') {
    console.log('Connection reset (uncaught)');
    return;  // Don't crash for connection resets
  }
  
  console.error('Uncaught exception:', err);
  process.exit(1);
});
```

## Socket.io Handling

```javascript
const { Server } = require('socket.io');
const io = new Server(httpServer);

io.on('connection', (socket) => {
  socket.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.log(`Socket ${socket.id} connection reset`);
    }
  });
  
  socket.on('disconnect', (reason) => {
    if (reason === 'transport error') {
      console.log(`Socket ${socket.id} transport error (possibly ECONNRESET)`);
    }
  });
});

// Handle server-level errors
io.engine.on('connection_error', (err) => {
  if (err.code === 'ECONNRESET') {
    console.log('Socket.io connection reset');
  }
});
```

## TCP Server Handling

```javascript
const net = require('net');

const server = net.createServer((socket) => {
  socket.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      console.log('Client connection reset');
      // Clean up resources for this client
    }
  });
  
  socket.on('data', (data) => {
    // Handle data
  });
  
  socket.on('close', (hadError) => {
    if (hadError) {
      console.log('Socket closed with error');
    }
  });
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(3000);
```

## Debugging Tips

### Enable Detailed Logging

```javascript
// Log all connection events
const https = require('https');

const agent = new https.Agent({ keepAlive: true });

agent.on('free', (socket, options) => {
  console.log('Socket returned to pool');
});

// Track socket events
function instrumentSocket(socket) {
  socket.on('connect', () => console.log('Socket connected'));
  socket.on('close', (hadError) => console.log('Socket closed', { hadError }));
  socket.on('error', (err) => console.log('Socket error:', err.code));
  socket.on('timeout', () => console.log('Socket timeout'));
}
```

### Monitor Connection Health

```javascript
class ConnectionMonitor {
  constructor() {
    this.stats = {
      total: 0,
      success: 0,
      resets: 0,
      timeouts: 0,
      errors: 0,
    };
  }
  
  track(error) {
    this.stats.total++;
    
    if (!error) {
      this.stats.success++;
    } else if (error.code === 'ECONNRESET') {
      this.stats.resets++;
    } else if (error.code === 'ETIMEDOUT') {
      this.stats.timeouts++;
    } else {
      this.stats.errors++;
    }
  }
  
  report() {
    const resetRate = this.stats.total 
      ? ((this.stats.resets / this.stats.total) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      resetRate: `${resetRate}%`,
    };
  }
}

const monitor = new ConnectionMonitor();

// Use in requests
async function monitoredRequest(url) {
  try {
    const result = await axios.get(url);
    monitor.track(null);
    return result;
  } catch (error) {
    monitor.track(error);
    throw error;
  }
}

// Log stats periodically
setInterval(() => {
  console.log('Connection stats:', monitor.report());
}, 60000);
```

## Prevention Strategies

### Implement Circuit Breaker

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'CLOSED';
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure >= this.resetTimeout) {
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
    if (error.code === 'ECONNRESET') {
      this.failures++;
      this.lastFailure = Date.now();
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.warn('Circuit breaker OPEN - too many connection resets');
      }
    }
  }
}
```

## Summary

| Cause | Solution |
|-------|----------|
| Server timeout | Increase timeout settings |
| Keep-alive expiry | Refresh connections |
| Server restart | Implement retry logic |
| Network issues | Use circuit breaker |
| High load | Implement connection pooling |

| Setting | Recommendation |
|---------|----------------|
| Keep-Alive | Enable with 30s interval |
| Timeout | 30-60 seconds |
| Max Retries | 3 attempts |
| Backoff | Exponential with jitter |

| Best Practice | Description |
|---------------|-------------|
| Retry logic | Retry on ECONNRESET |
| Connection pooling | Reuse connections |
| Error handling | Don't crash on resets |
| Monitoring | Track reset frequency |
