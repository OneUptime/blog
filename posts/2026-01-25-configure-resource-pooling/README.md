# How to Configure Resource Pooling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Performance, Backend, Database, Connection Pooling, Optimization

Description: Learn how to configure resource pooling for database connections, HTTP clients, threads, and objects. Proper pooling reduces latency, prevents resource exhaustion, and improves application throughput.

---

Creating resources is expensive. Database connections require TCP handshakes, authentication, and protocol negotiation. Thread creation involves kernel calls and memory allocation. HTTP clients need TLS handshakes. When your application creates and destroys these resources for every request, you waste CPU cycles and add latency.

Resource pooling solves this by maintaining a set of pre-initialized resources that get reused across requests. This guide covers practical pooling configurations for databases, HTTP clients, threads, and custom objects.

## How Resource Pooling Works

```mermaid
flowchart LR
    subgraph Application
        R1[Request 1]
        R2[Request 2]
        R3[Request 3]
    end

    subgraph Pool
        C1[Connection 1]
        C2[Connection 2]
        C3[Connection 3]
    end

    subgraph Database
        DB[(Database)]
    end

    R1 --> C1
    R2 --> C2
    R3 --> C3
    C1 --> DB
    C2 --> DB
    C3 --> DB
```

| Pool Parameter | Purpose | Impact of Wrong Setting |
|----------------|---------|------------------------|
| Minimum size | Pre-warmed connections | Too low: cold start latency |
| Maximum size | Connection limit | Too high: resource exhaustion |
| Idle timeout | When to close idle connections | Too short: connection churn |
| Max lifetime | Force connection refresh | Too long: stale connections |
| Acquire timeout | Wait time for connection | Too short: errors under load |

## Database Connection Pooling

### HikariCP (Java)

HikariCP is the fastest JDBC connection pool. Configure it for optimal performance:

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

public class DatabaseConfig {

    public HikariDataSource createDataSource() {
        HikariConfig config = new HikariConfig();

        // Connection settings
        config.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
        config.setUsername("user");
        config.setPassword("password");

        // Pool sizing
        // Formula: connections = (core_count * 2) + spindle_count
        // For SSD with 4 cores: (4 * 2) + 1 = 9, round to 10
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(5);

        // Timeouts
        // How long to wait for a connection from the pool
        config.setConnectionTimeout(30000); // 30 seconds

        // How long a connection can sit idle before being closed
        config.setIdleTimeout(600000); // 10 minutes

        // Maximum lifetime of a connection (prevents stale connections)
        config.setMaxLifetime(1800000); // 30 minutes

        // Validation
        // Query to test connection health
        config.setConnectionTestQuery("SELECT 1");

        // Frequency of keepalive packets (prevents firewall timeouts)
        config.setKeepaliveTime(300000); // 5 minutes

        // Leak detection (logs warning when connection isn't returned)
        config.setLeakDetectionThreshold(60000); // 1 minute

        // Pool name for monitoring
        config.setPoolName("MyAppPool");

        // Register MBeans for JMX monitoring
        config.setRegisterMbeans(true);

        return new HikariDataSource(config);
    }
}
```

### Node.js with pg-pool

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'user',
  password: 'password',

  // Pool sizing
  max: 20,                // Maximum connections in pool
  min: 5,                 // Minimum connections to maintain

  // Timeouts
  connectionTimeoutMillis: 30000,  // Wait 30s for connection
  idleTimeoutMillis: 600000,       // Close idle connections after 10 min

  // Keep connections alive (prevents firewall timeouts)
  keepAlive: true,
  keepAliveInitialDelayMillis: 300000, // 5 minutes

  // Allow connection reuse
  allowExitOnIdle: false
});

// Monitor pool events
pool.on('connect', (client) => {
  console.log('New client connected to pool');
});

pool.on('acquire', (client) => {
  console.log('Client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('Client removed from pool');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Proper usage pattern
async function queryWithPool(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

// For simple queries, use pool.query() which handles acquire/release
async function simpleQuery(sql, params) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});
```

### Python with SQLAlchemy

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

# Create engine with connection pooling
engine = create_engine(
    'postgresql://user:password@localhost:5432/mydb',

    # Pool class (QueuePool is default and recommended)
    poolclass=QueuePool,

    # Pool sizing
    pool_size=10,           # Number of connections to maintain
    max_overflow=5,         # Extra connections allowed under load

    # Timeouts
    pool_timeout=30,        # Seconds to wait for connection
    pool_recycle=1800,      # Recycle connections after 30 minutes
    pool_pre_ping=True,     # Test connections before using

    # Echo SQL for debugging (disable in production)
    echo=False
)

# Create session factory
Session = sessionmaker(bind=engine)

# Context manager for proper session handling
from contextlib import contextmanager

@contextmanager
def get_session():
    session = Session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# Usage
def get_users():
    with get_session() as session:
        return session.query(User).all()

# Monitor pool status
def get_pool_status():
    return {
        'pool_size': engine.pool.size(),
        'checked_in': engine.pool.checkedin(),
        'checked_out': engine.pool.checkedout(),
        'overflow': engine.pool.overflow(),
        'invalid': engine.pool.invalidated()
    }
```

## HTTP Client Connection Pooling

### Python Requests with Session

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_session():
    session = requests.Session()

    # Configure retry strategy
    retry_strategy = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS", "POST"]
    )

    # Configure connection pooling
    adapter = HTTPAdapter(
        pool_connections=10,    # Number of connection pools
        pool_maxsize=20,        # Max connections per pool
        max_retries=retry_strategy,
        pool_block=False        # Don't block when pool is full
    )

    # Mount adapter for both HTTP and HTTPS
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    # Default timeout for all requests
    session.timeout = (5, 30)  # (connect timeout, read timeout)

    return session

# Global session (reuse across requests)
http_session = create_session()

def fetch_data(url):
    response = http_session.get(url)
    response.raise_for_status()
    return response.json()
```

### Node.js Axios with Connection Reuse

```javascript
const axios = require('axios');
const https = require('https');
const http = require('http');

// Create agents with connection pooling
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,     // Keep connections alive for 60s
  maxSockets: 50,            // Max connections per host
  maxFreeSockets: 10,        // Max idle connections to keep
  timeout: 60000,            // Socket timeout
  scheduling: 'lifo'         // Reuse most recently used sockets
});

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'lifo'
});

// Create axios instance with pooled agents
const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  httpsAgent: httpsAgent,
  httpAgent: httpAgent,

  // Default headers
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for monitoring
apiClient.interceptors.response.use(
  (response) => {
    console.log(`Request to ${response.config.url} completed in ${response.duration}ms`);
    return response;
  },
  (error) => {
    console.error(`Request failed: ${error.message}`);
    return Promise.reject(error);
  }
);

// Usage
async function fetchUser(userId) {
  const response = await apiClient.get(`/users/${userId}`);
  return response.data;
}

// Monitor agent status
function getAgentStatus() {
  return {
    https: {
      sockets: Object.keys(httpsAgent.sockets).length,
      freeSockets: Object.keys(httpsAgent.freeSockets).length,
      requests: Object.keys(httpsAgent.requests).length
    }
  };
}
```

## Thread Pool Configuration

### Java ThreadPoolExecutor

```java
import java.util.concurrent.*;

public class ThreadPoolConfig {

    public static ThreadPoolExecutor createOptimizedPool() {
        // Core pool size: threads kept alive even when idle
        int corePoolSize = Runtime.getRuntime().availableProcessors();

        // Maximum pool size: upper limit of threads
        int maxPoolSize = corePoolSize * 2;

        // Keep alive time: how long excess threads wait before terminating
        long keepAliveTime = 60L;
        TimeUnit unit = TimeUnit.SECONDS;

        // Work queue: bounded queue prevents memory exhaustion
        BlockingQueue<Runnable> workQueue = new LinkedBlockingQueue<>(1000);

        // Thread factory: custom names for debugging
        ThreadFactory threadFactory = new ThreadFactory() {
            private int counter = 0;

            @Override
            public Thread newThread(Runnable r) {
                Thread thread = new Thread(r);
                thread.setName("worker-" + counter++);
                thread.setDaemon(false);
                return thread;
            }
        };

        // Rejection policy: what happens when pool and queue are full
        RejectedExecutionHandler rejectionHandler = new ThreadPoolExecutor.CallerRunsPolicy();

        ThreadPoolExecutor executor = new ThreadPoolExecutor(
            corePoolSize,
            maxPoolSize,
            keepAliveTime,
            unit,
            workQueue,
            threadFactory,
            rejectionHandler
        );

        // Allow core threads to timeout (saves resources during low load)
        executor.allowCoreThreadTimeOut(true);

        // Pre-start core threads (warm pool)
        executor.prestartAllCoreThreads();

        return executor;
    }

    // Monitor pool status
    public static void logPoolStatus(ThreadPoolExecutor executor) {
        System.out.println("Pool Size: " + executor.getPoolSize());
        System.out.println("Active Threads: " + executor.getActiveCount());
        System.out.println("Queued Tasks: " + executor.getQueue().size());
        System.out.println("Completed Tasks: " + executor.getCompletedTaskCount());
    }
}
```

### Python ThreadPoolExecutor

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

# Calculate optimal pool size
cpu_count = os.cpu_count() or 4

# For I/O-bound tasks, use more threads than CPUs
io_bound_pool = ThreadPoolExecutor(
    max_workers=cpu_count * 4,
    thread_name_prefix='io-worker'
)

# For CPU-bound tasks, match CPU count
cpu_bound_pool = ThreadPoolExecutor(
    max_workers=cpu_count,
    thread_name_prefix='cpu-worker'
)

# Usage with context manager (ensures cleanup)
def process_urls(urls):
    results = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all tasks
        future_to_url = {
            executor.submit(fetch_url, url): url
            for url in urls
        }

        # Process completed tasks
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                result = future.result(timeout=30)
                results.append((url, result))
            except Exception as e:
                results.append((url, f'Error: {e}'))

    return results

# Global pool for the application lifetime
app_pool = ThreadPoolExecutor(max_workers=20)

# Shutdown on exit
import atexit
atexit.register(lambda: app_pool.shutdown(wait=True))
```

## Generic Object Pooling

### Custom Object Pool in Python

```python
import threading
import time
from queue import Queue, Empty
from typing import TypeVar, Generic, Callable

T = TypeVar('T')

class ObjectPool(Generic[T]):
    def __init__(
        self,
        factory: Callable[[], T],
        max_size: int = 10,
        min_size: int = 2,
        max_idle_time: float = 300.0,
        validation_fn: Callable[[T], bool] = None
    ):
        self.factory = factory
        self.max_size = max_size
        self.min_size = min_size
        self.max_idle_time = max_idle_time
        self.validation_fn = validation_fn or (lambda x: True)

        self.pool = Queue(maxsize=max_size)
        self.size = 0
        self.lock = threading.Lock()
        self.timestamps = {}

        # Pre-populate minimum objects
        for _ in range(min_size):
            self._create_object()

    def _create_object(self):
        with self.lock:
            if self.size < self.max_size:
                obj = self.factory()
                self.pool.put(obj)
                self.timestamps[id(obj)] = time.time()
                self.size += 1
                return obj
        return None

    def acquire(self, timeout: float = 30.0) -> T:
        start_time = time.time()

        while True:
            try:
                obj = self.pool.get(timeout=1.0)

                # Check if object is still valid
                if not self.validation_fn(obj):
                    self._destroy_object(obj)
                    continue

                # Check idle time
                idle_time = time.time() - self.timestamps.get(id(obj), 0)
                if idle_time > self.max_idle_time:
                    self._destroy_object(obj)
                    continue

                return obj

            except Empty:
                # Try to create new object if pool is exhausted
                obj = self._create_object()
                if obj:
                    return obj

                # Check timeout
                if time.time() - start_time > timeout:
                    raise TimeoutError("Could not acquire object from pool")

    def release(self, obj: T):
        if self.validation_fn(obj):
            self.timestamps[id(obj)] = time.time()
            try:
                self.pool.put_nowait(obj)
            except:
                self._destroy_object(obj)
        else:
            self._destroy_object(obj)

    def _destroy_object(self, obj: T):
        with self.lock:
            self.timestamps.pop(id(obj), None)
            self.size -= 1
            # Ensure minimum pool size
            if self.size < self.min_size:
                self._create_object()

    def get_stats(self):
        return {
            'size': self.size,
            'available': self.pool.qsize(),
            'in_use': self.size - self.pool.qsize()
        }

# Example: Database connection pool
def create_connection():
    import psycopg2
    return psycopg2.connect(
        host='localhost',
        database='mydb',
        user='user',
        password='password'
    )

def validate_connection(conn):
    try:
        conn.cursor().execute('SELECT 1')
        return True
    except:
        return False

db_pool = ObjectPool(
    factory=create_connection,
    max_size=10,
    min_size=2,
    validation_fn=validate_connection
)
```

## Summary

Resource pooling is essential for high-performance applications. The key is finding the right balance for your workload.

| Resource Type | Key Parameters | Sizing Guideline |
|---------------|----------------|------------------|
| Database connections | max_size, idle_timeout | (CPU cores * 2) + disk spindles |
| HTTP clients | max_sockets, keepalive | Based on concurrent requests |
| Thread pools | core_size, max_size | CPU cores for CPU-bound, higher for I/O |
| Object pools | min_size, max_idle_time | Based on object creation cost |

Monitor your pools in production. Track acquisition time, pool utilization, and timeout errors. These metrics tell you when to adjust pool sizes and catch leaks before they cause outages.
