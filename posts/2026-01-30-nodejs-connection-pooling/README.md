# How to Create Connection Pooling in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Database, Performance, PostgreSQL

Description: Implement efficient connection pooling in Node.js for PostgreSQL and other databases with proper sizing, health checks, and error handling.

---

Connection pooling is one of those patterns that separates production-grade applications from hobby projects. If you have ever wondered why your Node.js application slows down under load or runs out of database connections, this guide will show you exactly how to fix it.

## Why Connection Pooling Matters

Every time your application connects to a database, several things happen behind the scenes:

1. A TCP connection is established (involves a 3-way handshake)
2. The database authenticates your credentials
3. The database allocates memory for the session
4. SSL/TLS negotiation occurs if encryption is enabled
5. Connection metadata is exchanged

This process typically takes 20-100ms depending on network latency and database configuration. For a single request, that is tolerable. For 1000 concurrent requests, you are looking at 20-100 seconds of cumulative overhead, plus the risk of exhausting database connection limits.

Connection pooling solves this by maintaining a set of pre-established connections that your application can borrow and return. The overhead happens once at startup, and subsequent requests reuse existing connections.

### The Numbers Tell the Story

Here is a comparison of connection handling approaches:

| Approach | Connection Time | Memory per Connection | Max Throughput |
|----------|----------------|----------------------|----------------|
| New connection per request | 20-100ms | 5-10MB | ~100 req/sec |
| Single shared connection | 0ms (reused) | 5-10MB | ~50 req/sec (serialized) |
| Connection pool (10 connections) | 0ms (reused) | 50-100MB | ~1000 req/sec |
| Connection pool (50 connections) | 0ms (reused) | 250-500MB | ~5000 req/sec |

The difference becomes dramatic at scale. A properly configured pool can handle 10-50x more throughput than creating connections on demand.

## Setting Up pg-pool for PostgreSQL

The `pg` package for Node.js includes a built-in Pool class. Let us start with a basic setup and then build on it.

### Basic Pool Configuration

First, install the required package:

```bash
npm install pg
```

Here is a minimal pool configuration that works for development:

```javascript
// db/pool.js
const { Pool } = require('pg');

// Basic pool configuration
// This creates a pool with default settings suitable for development
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'myapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',

  // Pool-specific settings
  max: 10,                    // Maximum connections in the pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Fail fast if connection takes > 2 seconds
});

module.exports = pool;
```

### Production-Ready Pool Configuration

For production, you need more robust settings. This configuration handles SSL, connection validation, and proper error handling:

```javascript
// db/pool.js
const { Pool } = require('pg');
const fs = require('fs');

// Production pool configuration with all recommended settings
const poolConfig = {
  // Connection settings
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // SSL configuration for production databases
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: true,
    ca: process.env.DB_CA_CERT
      ? fs.readFileSync(process.env.DB_CA_CERT).toString()
      : undefined,
  } : false,

  // Pool sizing - explained in detail below
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  min: parseInt(process.env.DB_POOL_MIN) || 2,

  // Timeouts
  idleTimeoutMillis: 30000,        // Remove idle connections after 30s
  connectionTimeoutMillis: 5000,   // Wait up to 5s for a connection

  // Statement timeout prevents runaway queries
  statement_timeout: 30000,        // Kill queries running longer than 30s

  // Application name helps with debugging in pg_stat_activity
  application_name: process.env.APP_NAME || 'nodejs-app',
};

const pool = new Pool(poolConfig);

// Log pool errors - these indicate serious problems
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // In production, send this to your error tracking service
});

// Log when connections are created (useful for debugging pool behavior)
pool.on('connect', (client) => {
  console.log('New client connected to pool');
});

// Log when connections are removed from the pool
pool.on('remove', (client) => {
  console.log('Client removed from pool');
});

module.exports = pool;
```

## Pool Sizing Strategies

Getting pool size right is critical. Too few connections and you create bottlenecks. Too many and you overwhelm your database.

### The Formula

A good starting point comes from the PostgreSQL documentation:

```
connections = (core_count * 2) + effective_spindle_count
```

For most cloud databases with SSD storage, this simplifies to:

```
connections = (cpu_cores * 2) + 1
```

However, this is per-application. If you have 5 Node.js instances connecting to a database with a 100-connection limit, each instance should use at most 20 connections.

### Dynamic Pool Sizing

Here is a utility that helps calculate optimal pool size based on your environment:

```javascript
// db/pool-sizing.js
const os = require('os');

/**
 * Calculate optimal pool size based on available resources
 * @param {Object} options Configuration options
 * @param {number} options.dbMaxConnections Maximum connections your DB allows
 * @param {number} options.appInstances Number of application instances
 * @param {number} options.reservedConnections Connections reserved for admin/monitoring
 * @returns {Object} Recommended pool configuration
 */
function calculatePoolSize(options = {}) {
  const {
    dbMaxConnections = 100,
    appInstances = 1,
    reservedConnections = 10,
  } = options;

  const cpuCount = os.cpus().length;

  // Calculate connections available per instance
  const availableConnections = dbMaxConnections - reservedConnections;
  const connectionsPerInstance = Math.floor(availableConnections / appInstances);

  // Apply the PostgreSQL formula as an upper bound
  const formulaMax = (cpuCount * 2) + 1;

  // Take the minimum of formula result and fair share
  const recommendedMax = Math.min(formulaMax, connectionsPerInstance);

  // Minimum should be enough to handle basic concurrency
  const recommendedMin = Math.max(2, Math.floor(recommendedMax / 4));

  return {
    max: recommendedMax,
    min: recommendedMin,
    cpuCount,
    reasoning: `Based on ${cpuCount} CPUs and ${connectionsPerInstance} available connections per instance`,
  };
}

// Example usage
const sizing = calculatePoolSize({
  dbMaxConnections: 100,
  appInstances: 3,
  reservedConnections: 10,
});

console.log(sizing);
// Output: { max: 9, min: 2, cpuCount: 4, reasoning: '...' }

module.exports = { calculatePoolSize };
```

### Pool Size by Workload Type

Different applications have different needs:

| Workload Type | Recommended Pool Size | Rationale |
|---------------|----------------------|-----------|
| API Server (I/O heavy) | CPU cores * 2 | Most time spent waiting on network |
| Background Worker | CPU cores | Compute-bound tasks |
| Mixed Workload | CPU cores * 1.5 | Balance between compute and I/O |
| Burst Traffic Handler | CPU cores * 4 | Handle traffic spikes |

## Connection Health Checks

Connections can go stale due to network issues, database restarts, or firewall timeouts. Implementing health checks prevents your application from using dead connections.

### Validation on Checkout

The pg library does not have built-in validation, but you can implement it with a wrapper:

```javascript
// db/validated-pool.js
const { Pool } = require('pg');

class ValidatedPool {
  constructor(config) {
    this.pool = new Pool(config);
    this.validationQuery = 'SELECT 1';
    this.validationTimeout = 3000;
  }

  /**
   * Get a client from the pool with validation
   * If the connection is dead, it will be removed and a new one acquired
   */
  async connect() {
    const client = await this.pool.connect();

    try {
      // Test the connection with a simple query
      await Promise.race([
        client.query(this.validationQuery),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Validation timeout')), this.validationTimeout)
        ),
      ]);

      return client;
    } catch (error) {
      // Connection is dead, release it with an error to remove from pool
      client.release(error);

      // Try to get a fresh connection
      return this.pool.connect();
    }
  }

  /**
   * Execute a query using the pool directly
   * Includes automatic retry on connection failure
   */
  async query(text, params) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.pool.query(text, params);
      } catch (error) {
        lastError = error;

        // Only retry on connection errors, not query errors
        if (!this.isConnectionError(error)) {
          throw error;
        }

        console.warn(`Query failed with connection error, attempt ${attempt + 1}/${maxRetries}`);
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is a connection-related error
   */
  isConnectionError(error) {
    const connectionErrorCodes = [
      'ECONNREFUSED',
      'ECONNRESET',
      'EPIPE',
      'ETIMEDOUT',
      '57P01', // admin_shutdown
      '57P02', // crash_shutdown
      '57P03', // cannot_connect_now
    ];

    return connectionErrorCodes.includes(error.code);
  }

  /**
   * Perform a health check on the pool
   */
  async healthCheck() {
    const startTime = Date.now();

    try {
      await this.query('SELECT 1');
      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingRequests: this.pool.waitingCount,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async end() {
    return this.pool.end();
  }
}

module.exports = ValidatedPool;
```

### Periodic Health Checks

For long-running applications, implement periodic health checks to detect issues before they affect users:

```javascript
// db/health-monitor.js

/**
 * Monitor pool health and emit events when problems occur
 */
class PoolHealthMonitor {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.unhealthyThreshold = options.unhealthyThreshold || 3;
    this.consecutiveFailures = 0;
    this.listeners = new Map();
    this.intervalId = null;
  }

  /**
   * Start monitoring the pool
   */
  start() {
    if (this.intervalId) {
      return; // Already running
    }

    this.intervalId = setInterval(async () => {
      await this.performCheck();
    }, this.checkInterval);

    // Perform initial check
    this.performCheck();

    console.log(`Pool health monitor started, checking every ${this.checkInterval}ms`);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Pool health monitor stopped');
    }
  }

  /**
   * Perform a single health check
   */
  async performCheck() {
    const startTime = Date.now();

    try {
      // Simple validation query
      await this.pool.query('SELECT 1');

      const metrics = {
        healthy: true,
        latencyMs: Date.now() - startTime,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingRequests: this.pool.waitingCount,
        timestamp: new Date().toISOString(),
      };

      // Reset failure counter on success
      if (this.consecutiveFailures > 0) {
        console.log('Pool health restored');
        this.emit('recovered', metrics);
      }
      this.consecutiveFailures = 0;

      this.emit('healthy', metrics);

      // Warn if connections are getting saturated
      const utilizationPercent =
        ((metrics.totalConnections - metrics.idleConnections) / this.pool.options.max) * 100;

      if (utilizationPercent > 80) {
        this.emit('highUtilization', {
          ...metrics,
          utilizationPercent,
        });
      }

    } catch (error) {
      this.consecutiveFailures++;

      const metrics = {
        healthy: false,
        error: error.message,
        latencyMs: Date.now() - startTime,
        consecutiveFailures: this.consecutiveFailures,
        timestamp: new Date().toISOString(),
      };

      this.emit('unhealthy', metrics);

      if (this.consecutiveFailures >= this.unhealthyThreshold) {
        this.emit('critical', metrics);
      }
    }
  }

  /**
   * Register an event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Emit an event to all registered listeners
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }
}

module.exports = PoolHealthMonitor;
```

Usage example:

```javascript
// app.js
const pool = require('./db/pool');
const PoolHealthMonitor = require('./db/health-monitor');

const monitor = new PoolHealthMonitor(pool, {
  checkInterval: 30000,    // Check every 30 seconds
  unhealthyThreshold: 3,   // Alert after 3 consecutive failures
});

monitor.on('healthy', (metrics) => {
  // Log metrics to your monitoring system
  console.log('Pool healthy:', metrics);
});

monitor.on('unhealthy', (metrics) => {
  console.warn('Pool unhealthy:', metrics);
});

monitor.on('critical', (metrics) => {
  console.error('Pool critical - consider restarting:', metrics);
  // Send alert to on-call
});

monitor.on('highUtilization', (metrics) => {
  console.warn(`Pool utilization at ${metrics.utilizationPercent}%`);
});

monitor.start();
```

## Handling Pool Exhaustion

When all connections are in use and clients are waiting, you need graceful handling to prevent cascading failures.

### Implementing Backpressure

Here is a wrapper that implements backpressure and circuit breaker patterns:

```javascript
// db/resilient-pool.js
const { Pool } = require('pg');

class ResilientPool {
  constructor(config) {
    this.config = config;
    this.pool = new Pool(config);

    // Circuit breaker state
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.failureThreshold = config.failureThreshold || 5;
    this.resetTimeout = config.resetTimeout || 30000;
    this.lastFailureTime = null;

    // Backpressure settings
    this.maxWaitingClients = config.maxWaitingClients || 100;

    // Track waiting clients
    this.waitingClients = 0;

    this.pool.on('error', (err) => {
      this.recordFailure(err);
    });
  }

  /**
   * Acquire a connection with backpressure and circuit breaker protection
   */
  async connect() {
    // Check circuit breaker
    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.circuitState = 'HALF_OPEN';
        console.log('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - database unavailable');
      }
    }

    // Check backpressure
    if (this.waitingClients >= this.maxWaitingClients) {
      throw new Error(`Pool exhausted - ${this.waitingClients} clients waiting`);
    }

    this.waitingClients++;

    try {
      const client = await this.pool.connect();

      // Success - potentially close circuit breaker
      if (this.circuitState === 'HALF_OPEN') {
        this.circuitState = 'CLOSED';
        this.failureCount = 0;
        console.log('Circuit breaker CLOSED');
      }

      // Wrap release to track waiting clients
      const originalRelease = client.release.bind(client);
      client.release = (err) => {
        this.waitingClients = Math.max(0, this.waitingClients - 1);
        if (err) {
          this.recordFailure(err);
        }
        return originalRelease(err);
      };

      return client;

    } catch (error) {
      this.waitingClients = Math.max(0, this.waitingClients - 1);
      this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Execute a query with automatic retry and timeout
   */
  async query(text, params, options = {}) {
    const timeout = options.timeout || 30000;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeout);
    });

    const queryPromise = this.pool.query(text, params);

    try {
      return await Promise.race([queryPromise, timeoutPromise]);
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Record a failure and potentially open the circuit breaker
   */
  recordFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.error(`Pool failure ${this.failureCount}/${this.failureThreshold}:`, error.message);

    if (this.failureCount >= this.failureThreshold && this.circuitState === 'CLOSED') {
      this.circuitState = 'OPEN';
      console.error('Circuit breaker OPEN - stopping requests to database');
    }
  }

  /**
   * Get current pool and circuit breaker status
   */
  getStatus() {
    return {
      circuitState: this.circuitState,
      failureCount: this.failureCount,
      waitingClients: this.waitingClients,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      poolWaitingCount: this.pool.waitingCount,
    };
  }

  async end() {
    return this.pool.end();
  }
}

module.exports = ResilientPool;
```

### Timeout Configuration

Proper timeouts prevent requests from hanging indefinitely:

```javascript
// db/timeout-config.js

/**
 * Recommended timeout configuration by environment
 */
const timeoutConfigs = {
  development: {
    connectionTimeoutMillis: 5000,   // 5 seconds to connect
    idleTimeoutMillis: 10000,        // Close idle connections after 10s
    statement_timeout: 60000,        // Allow longer queries during dev
    query_timeout: 60000,
  },

  production: {
    connectionTimeoutMillis: 3000,   // Fail fast in production
    idleTimeoutMillis: 30000,        // Keep connections around longer
    statement_timeout: 30000,        // Kill long-running queries
    query_timeout: 30000,
  },

  testing: {
    connectionTimeoutMillis: 1000,   // Very fast timeouts for tests
    idleTimeoutMillis: 1000,
    statement_timeout: 5000,
    query_timeout: 5000,
  },
};

function getTimeoutConfig(env = process.env.NODE_ENV) {
  return timeoutConfigs[env] || timeoutConfigs.development;
}

module.exports = { getTimeoutConfig, timeoutConfigs };
```

## Using generic-pool for Custom Resources

While pg has built-in pooling, you might need to pool other resources like Redis connections, HTTP clients, or custom services. The `generic-pool` library provides a flexible solution.

### Installation

```bash
npm install generic-pool
```

### Basic Usage

Here is how to create a pool for any resource:

```javascript
// pools/redis-pool.js
const genericPool = require('generic-pool');
const Redis = require('ioredis');

/**
 * Create a pool of Redis connections
 */
function createRedisPool(options = {}) {
  const factory = {
    // Called when a new resource is needed
    create: async () => {
      const client = new Redis({
        host: options.host || 'localhost',
        port: options.port || 6379,
        password: options.password,
        db: options.db || 0,
        // Disable built-in reconnection - let the pool handle it
        retryStrategy: () => null,
      });

      // Wait for connection to be ready
      await new Promise((resolve, reject) => {
        client.once('ready', resolve);
        client.once('error', reject);
      });

      console.log('Created new Redis connection');
      return client;
    },

    // Called when a resource is released
    destroy: async (client) => {
      console.log('Destroying Redis connection');
      await client.quit();
    },

    // Called to check if a resource is still valid
    validate: async (client) => {
      try {
        const result = await client.ping();
        return result === 'PONG';
      } catch (error) {
        return false;
      }
    },
  };

  const poolOptions = {
    max: options.max || 10,
    min: options.min || 2,
    acquireTimeoutMillis: options.acquireTimeout || 3000,
    idleTimeoutMillis: options.idleTimeout || 30000,
    evictionRunIntervalMillis: options.evictionInterval || 10000,
    testOnBorrow: true, // Validate before giving to client
  };

  return genericPool.createPool(factory, poolOptions);
}

module.exports = { createRedisPool };
```

### HTTP Client Pool

Pooling HTTP clients can improve performance for services that make many outbound requests:

```javascript
// pools/http-client-pool.js
const genericPool = require('generic-pool');
const http = require('http');
const https = require('https');

/**
 * Create a pool of HTTP agents with keep-alive connections
 */
function createHttpClientPool(options = {}) {
  const isHttps = options.protocol === 'https';
  const AgentClass = isHttps ? https.Agent : http.Agent;

  const factory = {
    create: async () => {
      const agent = new AgentClass({
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: options.timeout || 30000,
      });

      // Track creation time for age-based eviction
      agent._createdAt = Date.now();

      console.log('Created new HTTP agent');
      return agent;
    },

    destroy: async (agent) => {
      console.log('Destroying HTTP agent');
      agent.destroy();
    },

    validate: async (agent) => {
      // Reject agents older than 5 minutes
      const maxAge = 5 * 60 * 1000;
      return (Date.now() - agent._createdAt) < maxAge;
    },
  };

  return genericPool.createPool(factory, {
    max: options.max || 5,
    min: options.min || 1,
    acquireTimeoutMillis: 1000,
    testOnBorrow: true,
  });
}

module.exports = { createHttpClientPool };
```

### Generic Pool Wrapper Pattern

Here is a reusable wrapper that simplifies working with generic-pool:

```javascript
// pools/pool-wrapper.js
const genericPool = require('generic-pool');

/**
 * A wrapper class that simplifies using generic-pool
 * Provides automatic resource cleanup and convenience methods
 */
class PoolWrapper {
  constructor(factory, options = {}) {
    this.pool = genericPool.createPool(factory, {
      max: options.max || 10,
      min: options.min || 0,
      acquireTimeoutMillis: options.acquireTimeout || 5000,
      idleTimeoutMillis: options.idleTimeout || 30000,
      evictionRunIntervalMillis: options.evictionInterval || 15000,
      testOnBorrow: options.testOnBorrow !== false,
      ...options.poolOptions,
    });

    this.pool.on('factoryCreateError', (err) => {
      console.error('Pool factory create error:', err);
    });

    this.pool.on('factoryDestroyError', (err) => {
      console.error('Pool factory destroy error:', err);
    });
  }

  /**
   * Acquire a resource, use it, and automatically release it
   * @param {Function} fn Function that receives the resource
   * @returns {Promise} Result of the function
   */
  async use(fn) {
    const resource = await this.pool.acquire();

    try {
      return await fn(resource);
    } finally {
      await this.pool.release(resource);
    }
  }

  /**
   * Acquire a resource manually - caller is responsible for releasing
   */
  async acquire() {
    return this.pool.acquire();
  }

  /**
   * Release a resource back to the pool
   */
  async release(resource) {
    return this.pool.release(resource);
  }

  /**
   * Destroy a resource (do not return to pool)
   */
  async destroy(resource) {
    return this.pool.destroy(resource);
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      size: this.pool.size,
      available: this.pool.available,
      borrowed: this.pool.borrowed,
      pending: this.pool.pending,
      max: this.pool.max,
      min: this.pool.min,
    };
  }

  /**
   * Drain and close the pool
   */
  async close() {
    await this.pool.drain();
    await this.pool.clear();
  }
}

module.exports = PoolWrapper;
```

Usage example:

```javascript
// Example: Using PoolWrapper with a custom resource
const PoolWrapper = require('./pools/pool-wrapper');

// Create a pool for some external service client
const servicePool = new PoolWrapper({
  create: async () => {
    // Create your resource
    return new SomeServiceClient();
  },
  destroy: async (client) => {
    await client.disconnect();
  },
  validate: async (client) => {
    return client.isConnected();
  },
}, {
  max: 10,
  min: 2,
});

// Use the pool with automatic release
async function doSomething() {
  const result = await servicePool.use(async (client) => {
    return client.performOperation();
  });

  return result;
}
```

## Monitoring Pool Metrics

Proper monitoring helps you identify issues before they become outages.

### Metrics Collection

Here is a comprehensive metrics collector for your pools:

```javascript
// monitoring/pool-metrics.js

/**
 * Collect and expose pool metrics for monitoring systems
 */
class PoolMetrics {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.name = options.name || 'database';
    this.historySize = options.historySize || 60; // Keep 60 samples
    this.history = [];
    this.intervalId = null;
  }

  /**
   * Collect current metrics
   */
  collect() {
    const metrics = {
      timestamp: Date.now(),
      name: this.name,

      // Connection counts
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      waitingRequests: this.pool.waitingCount,

      // Calculated metrics
      utilizationPercent: this.pool.options.max > 0
        ? ((this.pool.totalCount - this.pool.idleCount) / this.pool.options.max) * 100
        : 0,

      // Configuration for context
      maxConnections: this.pool.options.max,
      minConnections: this.pool.options.min,
    };

    return metrics;
  }

  /**
   * Start collecting metrics at regular intervals
   */
  startCollecting(intervalMs = 10000) {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      const metrics = this.collect();
      this.history.push(metrics);

      // Trim history to configured size
      if (this.history.length > this.historySize) {
        this.history.shift();
      }
    }, intervalMs);

    console.log(`Started collecting metrics for pool "${this.name}" every ${intervalMs}ms`);
  }

  /**
   * Stop collecting metrics
   */
  stopCollecting() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  toPrometheusFormat() {
    const metrics = this.collect();
    const prefix = `db_pool_${this.name}`;

    return [
      `# HELP ${prefix}_connections_total Total connections in pool`,
      `# TYPE ${prefix}_connections_total gauge`,
      `${prefix}_connections_total ${metrics.totalConnections}`,
      '',
      `# HELP ${prefix}_connections_idle Idle connections in pool`,
      `# TYPE ${prefix}_connections_idle gauge`,
      `${prefix}_connections_idle ${metrics.idleConnections}`,
      '',
      `# HELP ${prefix}_connections_active Active connections in pool`,
      `# TYPE ${prefix}_connections_active gauge`,
      `${prefix}_connections_active ${metrics.activeConnections}`,
      '',
      `# HELP ${prefix}_waiting_requests Requests waiting for a connection`,
      `# TYPE ${prefix}_waiting_requests gauge`,
      `${prefix}_waiting_requests ${metrics.waitingRequests}`,
      '',
      `# HELP ${prefix}_utilization_percent Pool utilization percentage`,
      `# TYPE ${prefix}_utilization_percent gauge`,
      `${prefix}_utilization_percent ${metrics.utilizationPercent.toFixed(2)}`,
    ].join('\n');
  }

  /**
   * Get average metrics over the history period
   */
  getAverages() {
    if (this.history.length === 0) {
      return null;
    }

    const sum = this.history.reduce((acc, m) => ({
      totalConnections: acc.totalConnections + m.totalConnections,
      idleConnections: acc.idleConnections + m.idleConnections,
      activeConnections: acc.activeConnections + m.activeConnections,
      waitingRequests: acc.waitingRequests + m.waitingRequests,
      utilizationPercent: acc.utilizationPercent + m.utilizationPercent,
    }), {
      totalConnections: 0,
      idleConnections: 0,
      activeConnections: 0,
      waitingRequests: 0,
      utilizationPercent: 0,
    });

    const count = this.history.length;

    return {
      period: `${count} samples`,
      avgTotalConnections: (sum.totalConnections / count).toFixed(2),
      avgIdleConnections: (sum.idleConnections / count).toFixed(2),
      avgActiveConnections: (sum.activeConnections / count).toFixed(2),
      avgWaitingRequests: (sum.waitingRequests / count).toFixed(2),
      avgUtilizationPercent: (sum.utilizationPercent / count).toFixed(2),
      peakUtilization: Math.max(...this.history.map(m => m.utilizationPercent)).toFixed(2),
    };
  }
}

module.exports = PoolMetrics;
```

### Express Middleware for Metrics Endpoint

Expose your metrics via HTTP for Prometheus or other monitoring tools:

```javascript
// routes/metrics.js
const express = require('express');
const router = express.Router();

// Assuming you export your pool and metrics instances
const pool = require('../db/pool');
const PoolMetrics = require('../monitoring/pool-metrics');

const dbMetrics = new PoolMetrics(pool, { name: 'postgres' });
dbMetrics.startCollecting(10000);

// JSON metrics endpoint
router.get('/metrics/json', (req, res) => {
  res.json({
    current: dbMetrics.collect(),
    averages: dbMetrics.getAverages(),
  });
});

// Prometheus format endpoint
router.get('/metrics/prometheus', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(dbMetrics.toPrometheusFormat());
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      pool: dbMetrics.collect(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

module.exports = router;
```

## Putting It All Together

Here is a complete example that combines all the patterns discussed:

```javascript
// db/index.js
const { Pool } = require('pg');
const PoolMetrics = require('../monitoring/pool-metrics');
const PoolHealthMonitor = require('./health-monitor');
const { getTimeoutConfig } = require('./timeout-config');

class DatabaseConnection {
  constructor() {
    this.pool = null;
    this.metrics = null;
    this.healthMonitor = null;
  }

  async initialize(config = {}) {
    const timeouts = getTimeoutConfig();

    const poolConfig = {
      host: config.host || process.env.DB_HOST,
      port: config.port || parseInt(process.env.DB_PORT) || 5432,
      database: config.database || process.env.DB_NAME,
      user: config.user || process.env.DB_USER,
      password: config.password || process.env.DB_PASSWORD,

      max: config.max || parseInt(process.env.DB_POOL_MAX) || 20,
      min: config.min || parseInt(process.env.DB_POOL_MIN) || 2,

      ...timeouts,

      application_name: process.env.APP_NAME || 'nodejs-app',
    };

    this.pool = new Pool(poolConfig);

    // Set up error handling
    this.pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
    });

    // Initialize metrics collection
    this.metrics = new PoolMetrics(this.pool, { name: 'postgres' });
    this.metrics.startCollecting(10000);

    // Initialize health monitoring
    this.healthMonitor = new PoolHealthMonitor(this.pool, {
      checkInterval: 30000,
      unhealthyThreshold: 3,
    });

    this.healthMonitor.on('critical', (data) => {
      console.error('Database connection critical:', data);
      // Add your alerting logic here
    });

    this.healthMonitor.start();

    // Verify connection works
    await this.pool.query('SELECT 1');
    console.log('Database connection established');

    return this;
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async getClient() {
    return this.pool.connect();
  }

  getMetrics() {
    return this.metrics.collect();
  }

  async close() {
    this.metrics.stopCollecting();
    this.healthMonitor.stop();
    await this.pool.end();
    console.log('Database connection closed');
  }
}

// Singleton instance
const db = new DatabaseConnection();

module.exports = db;
```

Usage in your application:

```javascript
// app.js
const express = require('express');
const db = require('./db');

const app = express();

// Initialize database before starting server
async function start() {
  try {
    await db.initialize();

    app.get('/users/:id', async (req, res) => {
      try {
        const result = await db.query(
          'SELECT * FROM users WHERE id = $1',
          [req.params.id]
        );
        res.json(result.rows[0] || null);
      } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    app.get('/health', async (req, res) => {
      const metrics = db.getMetrics();
      res.json({
        status: 'ok',
        database: metrics,
      });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

start();
```

## Summary

Connection pooling is essential for building performant Node.js applications. The key takeaways are:

1. **Always use pooling** - Creating connections on demand does not scale
2. **Size your pool correctly** - Use the formula `(CPU cores * 2) + 1` as a starting point, then adjust based on your specific workload and available database connections
3. **Implement health checks** - Detect and recover from connection failures before users notice
4. **Handle exhaustion gracefully** - Use backpressure and circuit breakers to prevent cascading failures
5. **Monitor everything** - You cannot fix what you cannot measure

Start with the basic pg-pool configuration, add monitoring, and incrementally add resilience features as your application grows. The patterns shown here will serve you well from prototype to production.
