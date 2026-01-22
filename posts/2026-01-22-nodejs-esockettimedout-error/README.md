# How to Fix 'Error: ESOCKETTIMEDOUT' in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Node.js, Error Handling, Networking, Timeout, Debugging

Description: Learn how to diagnose and fix the ESOCKETTIMEDOUT error in Node.js applications, including timeout configuration and retry strategies.

---

The `ESOCKETTIMEDOUT` error occurs when a socket connection times out while waiting for a response. This typically happens during HTTP requests when the server takes too long to respond or the network is slow. Let's explore how to fix this error.

## Understanding ESOCKETTIMEDOUT

This error differs from `ETIMEDOUT` in that it specifically relates to socket-level timeouts rather than connection establishment timeouts:

```javascript
// Example error
{
  code: 'ESOCKETTIMEDOUT',
  message: 'Socket timed out',
  connect: false
}
```

## Common Causes

1. Server taking too long to respond
2. Large file transfers
3. Network congestion
4. Server overload
5. Incorrect timeout settings

## Solution 1: Increase Timeout with Request Library

```javascript
const request = require('request');

// Configure timeout options
const options = {
  url: 'https://api.example.com/data',
  timeout: 30000, // Connection timeout in ms
  // More specific timeout control
  time: true,
  pool: {
    maxSockets: 100
  }
};

request(options, (error, response, body) => {
  if (error) {
    if (error.code === 'ESOCKETTIMEDOUT') {
      console.error('Socket timed out waiting for response');
      // Handle timeout - maybe retry
    }
    return;
  }
  console.log('Response received:', body);
});
```

## Solution 2: Configure Axios Timeouts

```javascript
const axios = require('axios');

// Create axios instance with timeout configuration
const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 30000, // 30 seconds
  // Separate timeouts for different phases
  timeoutErrorMessage: 'Request timed out - server not responding'
});

// Add response interceptor for timeout handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('Request timed out:', error.config.url);
      // Optionally retry the request
      return retryRequest(error.config);
    }
    return Promise.reject(error);
  }
);

// Retry logic
async function retryRequest(config, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Retry attempt ${i + 1}/${retries}`);
      // Increase timeout on each retry
      config.timeout = config.timeout * (i + 1);
      return await axios(config);
    } catch (error) {
      if (i === retries - 1) throw error;
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Usage
async function fetchData() {
  try {
    const response = await apiClient.get('/large-dataset');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch data:', error.message);
  }
}
```

## Solution 3: Native HTTP with Socket Timeout

```javascript
const http = require('http');
const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = options.timeout || 30000;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      
      // Set socket timeout on response
      res.socket.setTimeout(timeout);
      res.socket.on('timeout', () => {
        req.destroy();
        reject(new Error('ESOCKETTIMEDOUT: Response socket timed out'));
      });
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    // Connection timeout
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('ESOCKETTIMEDOUT: Request timed out'));
    });
    
    req.on('error', reject);
  });
}

// Usage with proper error handling
async function fetchWithTimeout() {
  try {
    const data = await makeRequest('https://api.example.com/data', {
      timeout: 60000 // 60 seconds for slow endpoints
    });
    console.log('Data received:', data);
  } catch (error) {
    if (error.message.includes('ESOCKETTIMEDOUT')) {
      console.error('The server took too long to respond');
      // Implement fallback or retry logic
    }
  }
}
```

## Solution 4: Got Library with Advanced Timeouts

```javascript
const got = require('got');

// Create client with detailed timeout configuration
const client = got.extend({
  timeout: {
    lookup: 1000,      // DNS lookup timeout
    connect: 5000,     // TCP connection timeout
    secureConnect: 5000, // TLS handshake timeout
    socket: 30000,     // Socket inactivity timeout
    send: 10000,       // Time to send request
    response: 30000    // Time to receive response headers
  },
  retry: {
    limit: 3,
    methods: ['GET', 'POST'],
    statusCodes: [408, 429, 500, 502, 503, 504],
    errorCodes: [
      'ETIMEDOUT',
      'ECONNRESET',
      'EADDRINUSE',
      'ECONNREFUSED',
      'EPIPE',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
      'ESOCKETTIMEDOUT'
    ],
    calculateDelay: ({ attemptCount }) => {
      // Exponential backoff
      return Math.min(1000 * Math.pow(2, attemptCount - 1), 30000);
    }
  },
  hooks: {
    beforeRetry: [
      (options, error, retryCount) => {
        console.log(`Retry #${retryCount} for ${options.url}: ${error.code}`);
      }
    ]
  }
});

// Usage
async function fetchData() {
  try {
    const response = await client.get('https://api.example.com/data');
    return response.body;
  } catch (error) {
    if (error.code === 'ESOCKETTIMEDOUT') {
      console.error('Socket timeout after all retries');
    }
    throw error;
  }
}
```

## Solution 5: Node-fetch with AbortController

```javascript
const fetch = require('node-fetch');
const AbortController = require('abort-controller');

async function fetchWithTimeout(url, options = {}) {
  const timeout = options.timeout || 30000;
  const controller = new AbortController();
  
  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      const timeoutError = new Error('ESOCKETTIMEDOUT');
      timeoutError.code = 'ESOCKETTIMEDOUT';
      throw timeoutError;
    }
    throw error;
  }
}

// Wrapper with retry logic
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Increase timeout with each retry
      const timeout = (options.timeout || 30000) * (i + 1);
      
      const response = await fetchWithTimeout(url, {
        ...options,
        timeout
      });
      
      if (response.ok) {
        return response;
      }
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${i + 1} failed: ${error.message}`);
      
      if (i < maxRetries - 1) {
        // Wait before retrying with exponential backoff
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}
```

## Solution 6: Keep-Alive Agent for Better Performance

```javascript
const http = require('http');
const https = require('https');
const axios = require('axios');

// Create keep-alive agents to reuse connections
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000
});

// Use with axios
const apiClient = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 30000
});

// Monitor agent status
function logAgentStatus() {
  console.log('HTTP Agent:', {
    sockets: Object.keys(httpAgent.sockets).length,
    freeSockets: Object.keys(httpAgent.freeSockets).length,
    requests: Object.keys(httpAgent.requests).length
  });
}

// Periodic status check
setInterval(logAgentStatus, 60000);
```

## Solution 7: Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      // Check if we should try again
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF-OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log('Circuit breaker opened due to failures');
    }
  }
}

// Usage
const breaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000
});

async function makeApiCall() {
  return breaker.execute(async () => {
    const response = await axios.get('https://api.example.com/data', {
      timeout: 30000
    });
    return response.data;
  });
}
```

## Debugging Socket Timeouts

```javascript
const http = require('http');
const https = require('https');

// Enable socket debugging
function debugRequest(url) {
  const protocol = url.startsWith('https') ? https : http;
  
  const req = protocol.get(url, (res) => {
    console.log('Response status:', res.statusCode);
    console.log('Response headers:', res.headers);
    
    res.socket.on('timeout', () => {
      console.error('Socket timeout on response');
    });
    
    res.on('data', chunk => {
      console.log(`Received ${chunk.length} bytes`);
    });
  });
  
  req.on('socket', (socket) => {
    console.log('Socket assigned');
    
    socket.on('connect', () => {
      console.log('Socket connected');
      console.log('Local address:', socket.localAddress);
      console.log('Remote address:', socket.remoteAddress);
    });
    
    socket.on('timeout', () => {
      console.error('Socket timeout event');
    });
    
    socket.on('close', (hadError) => {
      console.log('Socket closed, had error:', hadError);
    });
  });
  
  req.on('error', (error) => {
    console.error('Request error:', error.code, error.message);
  });
  
  // Set timeout
  req.setTimeout(30000, () => {
    console.error('Request timeout triggered');
    req.destroy();
  });
}
```

## Best Practices

1. **Set appropriate timeouts** - Match timeout to expected response time
2. **Implement retry logic** - Use exponential backoff
3. **Use keep-alive connections** - Reduce connection overhead
4. **Monitor socket pools** - Track connection usage
5. **Implement circuit breakers** - Prevent cascade failures

## Summary

| Solution | Use Case | Timeout Control |
|----------|----------|-----------------|
| Axios | General HTTP | Connection + Response |
| Got | Advanced retry | Phase-specific |
| Native HTTP | Full control | Socket + Request |
| node-fetch | Modern syntax | AbortController |
| Keep-alive | High throughput | Agent-level |
| Circuit Breaker | Fault tolerance | Request-level |

The `ESOCKETTIMEDOUT` error is manageable with proper timeout configuration and retry strategies. Choose the solution that best fits your application's needs and always implement graceful error handling for production systems.
