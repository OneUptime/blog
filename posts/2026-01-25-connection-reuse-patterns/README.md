# How to Implement Connection Reuse Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Connection Pooling, HTTP Keep-Alive, Performance, Python, Node.js, Go, Networking, Backend

Description: Learn how to implement connection reuse patterns to reduce latency and improve throughput. This guide covers HTTP keep-alive, connection pooling, and persistent connections across different languages and protocols.

---

> Creating a new connection for every request is expensive. TCP handshakes, TLS negotiations, and connection setup can add 50-200ms of latency per request. Connection reuse eliminates this overhead by keeping connections open for multiple requests. This guide shows you how to implement connection reuse effectively.

Connection reuse is one of the simplest yet most impactful performance optimizations you can make.

---

## Why Connection Reuse Matters

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    Note over C,S: Without Keep-Alive
    C->>S: TCP SYN
    S->>C: TCP SYN-ACK
    C->>S: TCP ACK
    C->>S: TLS Handshake (4 round trips)
    C->>S: HTTP Request 1
    S->>C: HTTP Response 1
    C->>S: TCP FIN
    Note over C,S: Repeat for every request

    Note over C,S: With Keep-Alive
    C->>S: TCP SYN + TLS (once)
    C->>S: HTTP Request 1
    S->>C: HTTP Response 1
    C->>S: HTTP Request 2
    S->>C: HTTP Response 2
    C->>S: HTTP Request N
    S->>C: HTTP Response N
```

Connection overhead breakdown:
- TCP handshake: 1 round trip (~20-50ms)
- TLS 1.3 handshake: 1 round trip (~20-50ms)
- TLS 1.2 handshake: 2 round trips (~40-100ms)

With connection reuse, you pay this cost once instead of per request.

---

## HTTP Keep-Alive in Python

### Using requests with Sessions

```python
# requests_session.py
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time

# Bad: Creates new connection per request
def fetch_without_session(urls):
    results = []
    for url in urls:
        response = requests.get(url)  # New connection each time
        results.append(response.json())
    return results

# Good: Reuses connections with Session
def fetch_with_session(urls):
    session = requests.Session()

    # Configure connection pooling
    adapter = HTTPAdapter(
        pool_connections=10,  # Number of connection pools
        pool_maxsize=20,      # Connections per pool
        max_retries=Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504]
        )
    )
    session.mount('http://', adapter)
    session.mount('https://', adapter)

    results = []
    for url in urls:
        response = session.get(url)  # Reuses connection
        results.append(response.json())

    session.close()
    return results


# Benchmark
urls = ["https://api.example.com/data"] * 100

start = time.perf_counter()
fetch_without_session(urls)
print(f"Without session: {time.perf_counter() - start:.2f}s")

start = time.perf_counter()
fetch_with_session(urls)
print(f"With session: {time.perf_counter() - start:.2f}s")
# Typically 3-5x faster with session
```

### Global Session Pattern

```python
# global_session.py
import requests
from requests.adapters import HTTPAdapter
from contextlib import contextmanager
from typing import Optional
import threading

class HTTPClient:
    """Thread-safe HTTP client with connection pooling"""

    _instance: Optional['HTTPClient'] = None
    _lock = threading.Lock()

    def __init__(self):
        self.session = requests.Session()

        # Configure for high throughput
        adapter = HTTPAdapter(
            pool_connections=100,
            pool_maxsize=100,
            pool_block=True  # Block when pool is exhausted
        )
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)

        # Set default headers
        self.session.headers.update({
            'User-Agent': 'MyApp/1.0',
            'Accept': 'application/json',
        })

    @classmethod
    def get_instance(cls) -> 'HTTPClient':
        """Get singleton instance"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def get(self, url: str, **kwargs) -> requests.Response:
        return self.session.get(url, **kwargs)

    def post(self, url: str, **kwargs) -> requests.Response:
        return self.session.post(url, **kwargs)

    def close(self):
        self.session.close()


# Usage
client = HTTPClient.get_instance()
response = client.get("https://api.example.com/users")
```

### Async HTTP with aiohttp

```python
# aiohttp_session.py
import aiohttp
import asyncio
from typing import List, Dict

class AsyncHTTPClient:
    """Async HTTP client with connection pooling"""

    def __init__(self, max_connections: int = 100):
        self.connector = aiohttp.TCPConnector(
            limit=max_connections,           # Total connections
            limit_per_host=30,               # Per-host connections
            keepalive_timeout=30,            # Keep-alive duration
            enable_cleanup_closed=True,      # Clean up closed connections
            force_close=False,               # Reuse connections
        )
        self.session: aiohttp.ClientSession = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            connector=self.connector,
            timeout=aiohttp.ClientTimeout(total=30)
        )
        return self

    async def __aexit__(self, *args):
        await self.session.close()

    async def get(self, url: str) -> Dict:
        async with self.session.get(url) as response:
            return await response.json()

    async def get_many(self, urls: List[str]) -> List[Dict]:
        """Fetch multiple URLs concurrently with connection reuse"""
        tasks = [self.get(url) for url in urls]
        return await asyncio.gather(*tasks)


# Usage
async def main():
    urls = [f"https://api.example.com/items/{i}" for i in range(100)]

    async with AsyncHTTPClient(max_connections=50) as client:
        results = await client.get_many(urls)
        print(f"Fetched {len(results)} items")

asyncio.run(main())
```

---

## HTTP Keep-Alive in Node.js

### Native HTTP Agent

```javascript
// http-agent.js
const http = require('http');
const https = require('https');

// Create persistent agents
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,           // Max sockets per host
  maxFreeSockets: 10,        // Max idle sockets to keep
  timeout: 60000,            // Socket timeout
  keepAliveMsecs: 30000,     // Keep-alive probe interval
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
});

// Use with native http/https
function makeRequest(url) {
  const isHttps = url.startsWith('https');
  const agent = isHttps ? httpsAgent : httpAgent;
  const lib = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.get(url, { agent }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
  });
}

// Monitor agent stats
function getAgentStats() {
  return {
    http: {
      sockets: Object.keys(httpAgent.sockets).length,
      freeSockets: Object.keys(httpAgent.freeSockets).length,
      requests: Object.keys(httpAgent.requests).length,
    },
    https: {
      sockets: Object.keys(httpsAgent.sockets).length,
      freeSockets: Object.keys(httpsAgent.freeSockets).length,
      requests: Object.keys(httpsAgent.requests).length,
    }
  };
}
```

### Axios with Keep-Alive

```javascript
// axios-keepalive.js
const axios = require('axios');
const https = require('https');
const http = require('http');

// Create axios instance with keep-alive
const client = axios.create({
  timeout: 30000,
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 100,
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 100,
  }),
});

// Add response interceptor for timing
client.interceptors.request.use(config => {
  config.metadata = { startTime: Date.now() };
  return config;
});

client.interceptors.response.use(response => {
  const duration = Date.now() - response.config.metadata.startTime;
  console.log(`${response.config.url}: ${duration}ms`);
  return response;
});

// Usage
async function fetchData() {
  // All requests reuse connections
  const results = await Promise.all([
    client.get('https://api.example.com/users'),
    client.get('https://api.example.com/products'),
    client.get('https://api.example.com/orders'),
  ]);
  return results.map(r => r.data);
}
```

### Undici (Modern Node.js HTTP Client)

```javascript
// undici-client.js
const { Pool, Agent } = require('undici');

// Create connection pool for specific host
const pool = new Pool('https://api.example.com', {
  connections: 100,          // Max connections
  pipelining: 10,            // Requests per connection
  keepAliveTimeout: 30000,
  keepAliveMaxTimeout: 60000,
});

async function fetchWithPool(path) {
  const { statusCode, body } = await pool.request({
    method: 'GET',
    path: path,
  });

  let data = '';
  for await (const chunk of body) {
    data += chunk;
  }
  return JSON.parse(data);
}

// Global agent for any host
const agent = new Agent({
  connections: 100,
  pipelining: 10,
  keepAliveTimeout: 30000,
});

const { setGlobalDispatcher } = require('undici');
setGlobalDispatcher(agent);

// Now fetch() uses connection pooling by default
async function fetchData() {
  const response = await fetch('https://api.example.com/data');
  return response.json();
}
```

---

## HTTP Keep-Alive in Go

### Standard Library http.Client

```go
// http_client.go
package main

import (
    "io"
    "net"
    "net/http"
    "time"
)

// Create a reusable HTTP client
func createHTTPClient() *http.Client {
    transport := &http.Transport{
        // Connection pool settings
        MaxIdleConns:        100,              // Max idle connections total
        MaxIdleConnsPerHost: 20,               // Max idle per host
        MaxConnsPerHost:     100,              // Max connections per host
        IdleConnTimeout:     90 * time.Second, // Idle connection timeout

        // Connection settings
        DialContext: (&net.Dialer{
            Timeout:   30 * time.Second,
            KeepAlive: 30 * time.Second,
        }).DialContext,

        // TLS settings
        TLSHandshakeTimeout:   10 * time.Second,
        ExpectContinueTimeout: 1 * time.Second,

        // Enable HTTP/2
        ForceAttemptHTTP2: true,
    }

    return &http.Client{
        Transport: transport,
        Timeout:   30 * time.Second,
    }
}

// Global client (safe for concurrent use)
var httpClient = createHTTPClient()

func fetchData(url string) ([]byte, error) {
    resp, err := httpClient.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Important: Always read and close body to reuse connection
    return io.ReadAll(resp.Body)
}

// Ensure body is fully read for connection reuse
func drainBody(resp *http.Response) {
    if resp.Body != nil {
        io.Copy(io.Discard, resp.Body)
        resp.Body.Close()
    }
}
```

### Connection Pool Monitoring

```go
// pool_metrics.go
package main

import (
    "net/http/httptrace"
    "sync/atomic"
    "time"
)

type ConnectionMetrics struct {
    ConnectionsCreated  int64
    ConnectionsReused   int64
    DNSLookups          int64
    TLSHandshakes       int64
    TotalRequestTime    int64
}

var metrics = &ConnectionMetrics{}

func tracedRequest(req *http.Request) *http.Request {
    trace := &httptrace.ClientTrace{
        GotConn: func(info httptrace.GotConnInfo) {
            if info.Reused {
                atomic.AddInt64(&metrics.ConnectionsReused, 1)
            } else {
                atomic.AddInt64(&metrics.ConnectionsCreated, 1)
            }
        },
        DNSDone: func(info httptrace.DNSDoneInfo) {
            atomic.AddInt64(&metrics.DNSLookups, 1)
        },
        TLSHandshakeDone: func(state tls.ConnectionState, err error) {
            if err == nil {
                atomic.AddInt64(&metrics.TLSHandshakes, 1)
            }
        },
    }

    return req.WithContext(httptrace.WithClientTrace(req.Context(), trace))
}

func getConnectionStats() map[string]int64 {
    return map[string]int64{
        "connections_created": atomic.LoadInt64(&metrics.ConnectionsCreated),
        "connections_reused":  atomic.LoadInt64(&metrics.ConnectionsReused),
        "dns_lookups":         atomic.LoadInt64(&metrics.DNSLookups),
        "tls_handshakes":      atomic.LoadInt64(&metrics.TLSHandshakes),
    }
}
```

---

## Database Connection Reuse

### PostgreSQL Connection Pool

```python
# postgres_pool.py
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
import threading

class DatabasePool:
    """PostgreSQL connection pool for connection reuse"""

    _instance = None
    _lock = threading.Lock()

    def __init__(self, dsn: str, min_conn: int = 5, max_conn: int = 20):
        self.pool = pool.ThreadedConnectionPool(
            minconn=min_conn,
            maxconn=max_conn,
            dsn=dsn
        )

    @classmethod
    def initialize(cls, dsn: str, min_conn: int = 5, max_conn: int = 20):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls(dsn, min_conn, max_conn)
        return cls._instance

    @classmethod
    def get_instance(cls) -> 'DatabasePool':
        if cls._instance is None:
            raise RuntimeError("Database pool not initialized")
        return cls._instance

    @contextmanager
    def connection(self):
        """Get a connection from the pool"""
        conn = None
        try:
            conn = self.pool.getconn()
            yield conn
            conn.commit()
        except Exception:
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                self.pool.putconn(conn)

    def close(self):
        self.pool.closeall()


# Usage
DatabasePool.initialize(
    dsn="postgresql://user:pass@localhost/db",
    min_conn=5,
    max_conn=20
)

db = DatabasePool.get_instance()

# Connections are reused
with db.connection() as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cur.fetchone()
```

---

## Redis Connection Reuse

```python
# redis_pool.py
import redis
from typing import Optional
import threading

class RedisPool:
    """Redis connection pool for connection reuse"""

    _instance: Optional['RedisPool'] = None
    _lock = threading.Lock()

    def __init__(self, url: str, max_connections: int = 50):
        self.pool = redis.ConnectionPool.from_url(
            url,
            max_connections=max_connections,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True
        )
        self.client = redis.Redis(connection_pool=self.pool)

    @classmethod
    def initialize(cls, url: str, max_connections: int = 50) -> 'RedisPool':
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls(url, max_connections)
        return cls._instance

    @classmethod
    def get_client(cls) -> redis.Redis:
        if cls._instance is None:
            raise RuntimeError("Redis pool not initialized")
        return cls._instance.client

    def get_pool_stats(self) -> dict:
        return {
            'max_connections': self.pool.max_connections,
            'created_connections': self.pool._created_connections,
            'available_connections': len(self.pool._available_connections),
            'in_use_connections': len(self.pool._in_use_connections),
        }


# Usage
RedisPool.initialize("redis://localhost:6379", max_connections=100)

redis_client = RedisPool.get_client()
redis_client.set("key", "value")  # Uses pooled connection
```

---

## gRPC Connection Reuse

```python
# grpc_channel.py
import grpc
from typing import Dict, Optional
import threading

class GRPCChannelPool:
    """gRPC channel pool for connection reuse"""

    def __init__(self):
        self._channels: Dict[str, grpc.Channel] = {}
        self._lock = threading.Lock()

    def get_channel(self, target: str, options: list = None) -> grpc.Channel:
        """Get or create a channel for the target"""
        if target not in self._channels:
            with self._lock:
                if target not in self._channels:
                    options = options or [
                        ('grpc.keepalive_time_ms', 30000),
                        ('grpc.keepalive_timeout_ms', 10000),
                        ('grpc.keepalive_permit_without_calls', True),
                        ('grpc.http2.max_pings_without_data', 0),
                        ('grpc.http2.min_ping_interval_without_data_ms', 10000),
                    ]
                    self._channels[target] = grpc.insecure_channel(
                        target,
                        options=options
                    )
        return self._channels[target]

    def close_all(self):
        """Close all channels"""
        for channel in self._channels.values():
            channel.close()
        self._channels.clear()


# Global pool
grpc_pool = GRPCChannelPool()

# Usage
channel = grpc_pool.get_channel("localhost:50051")
stub = MyServiceStub(channel)
response = stub.MyMethod(request)  # Reuses channel
```

---

## Best Practices Summary

| Protocol | Connection Reuse Method | Key Configuration |
|----------|------------------------|-------------------|
| HTTP/1.1 | Keep-Alive header | `Connection: keep-alive` |
| HTTP/2 | Multiplexing | Single connection per host |
| PostgreSQL | Connection pool | `max_connections`, `min_connections` |
| Redis | Connection pool | `max_connections` |
| gRPC | Channel reuse | Keepalive settings |

---

## Conclusion

Connection reuse is essential for performance:

1. **Always use connection pools**: For databases, caches, and HTTP
2. **Configure pool sizes**: Based on expected concurrency
3. **Use global clients**: Share across request handlers
4. **Monitor metrics**: Track connection reuse ratio
5. **Handle errors properly**: Return connections to pool even on failure

The performance gain from connection reuse is substantial and the implementation is straightforward. Make it a default practice in all your applications.

---

*Need to monitor your connection pools? [OneUptime](https://oneuptime.com) provides connection pool monitoring with metrics for active connections, wait times, and pool utilization.*
