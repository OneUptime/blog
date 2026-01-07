# How to Implement Connection Pooling in Node.js for PostgreSQL/MySQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, PostgreSQL, Database, Performance, DevOps

Description: Learn to implement efficient database connection pooling in Node.js for PostgreSQL and MySQL, including pool sizing, health checks, and handling connection failures at scale.

---

Opening a database connection is expensive. Each connection requires a TCP handshake, authentication, and server-side resource allocation. Without connection pooling, a busy Node.js application will either exhaust database connections or spend more time establishing connections than executing queries.

Connection pooling maintains a set of reusable connections, eliminating the overhead of repeatedly connecting and disconnecting.

## Why Connection Pooling Matters

| Approach | Connection Time | Query Time | Total |
|----------|----------------|------------|-------|
| No pooling | ~50ms | ~5ms | ~55ms |
| With pooling | ~0.1ms | ~5ms | ~5.1ms |

For an application handling 1000 queries/second, that's the difference between 55 seconds and 5 seconds of cumulative latency.

## PostgreSQL Connection Pooling with pg

### Basic Pool Setup

This configuration creates a PostgreSQL connection pool with essential settings for production use. The pool maintains a minimum number of connections and automatically handles connection lifecycle, including timeout and recycling.

```javascript
const { Pool } = require('pg');

// Create a connection pool with production-ready settings
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool configuration
  max: 20,                    // Maximum connections in pool
  min: 5,                     // Minimum connections to maintain (prevents cold starts)
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
  maxUses: 7500,              // Close connection after 7500 queries (prevents memory leaks)
});

// Handle pool errors - prevents unhandled exceptions from crashing the app
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
```

### Query Execution Patterns

The pg library supports two query patterns: simple queries where the pool manages connections automatically, and dedicated client connections for transactions where multiple queries must use the same connection.

```javascript
// Simple query - pool manages connection automatically
// Best for single, independent queries
async function getUser(id) {
  // pool.query automatically acquires, uses, and releases a connection
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',  // $1 is a parameterized placeholder
    [id]                                    // Parameters are safely escaped
  );
  return result.rows[0];
}

// Multiple queries - get a dedicated client for transactions
// Required when queries must share the same connection and transaction
async function transferFunds(fromId, toId, amount) {
  // Acquire a dedicated client from the pool
  const client = await pool.connect();

  try {
    // Start transaction - all queries until COMMIT are atomic
    await client.query('BEGIN');

    // Debit from source account
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );

    // Credit to destination account
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );

    // Commit transaction - makes changes permanent
    await client.query('COMMIT');
  } catch (error) {
    // Rollback on any error - reverts all changes in transaction
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // CRITICAL: Always release the client back to the pool
    // Failing to release will cause connection pool exhaustion
    client.release();
  }
}
```

### Pool Sizing Strategy

Optimal pool size depends on database server capacity and the number of application instances. This formula ensures you don't overwhelm the database while maximizing connection utilization across your cluster.

```javascript
// Calculate optimal pool size based on database and application topology
function calculatePoolSize() {
  // PostgreSQL recommendation: connections = (core_count * 2) + effective_spindle_count
  // For SSDs, effective_spindle_count is typically 1

  const cpuCount = require('os').cpus().length;
  const dbCpuCount = parseInt(process.env.DB_CPU_COUNT) || 4;

  // Optimal connections for the database server
  const optimalDbConnections = (dbCpuCount * 2) + 1;

  // Divide among application instances to avoid exceeding DB capacity
  const appInstanceCount = parseInt(process.env.APP_INSTANCE_COUNT) || 1;

  return Math.floor(optimalDbConnections / appInstanceCount);
}

// Create pool with calculated size
const pool = new Pool({
  max: calculatePoolSize(),
  // ... other options
});
```

### Connection Health Checks

Regular health checks ensure your application detects database connectivity issues early. The health endpoint exposes pool statistics that are useful for monitoring and alerting.

```javascript
const pool = new Pool({
  // ... connection options

  // Validate connections before use - prevents using stale connections
  query_timeout: 30000, // 30 second query timeout
});

// Periodic health check - validates pool can execute queries
async function checkPoolHealth() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');  // Simple query to verify connectivity
    client.release();
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

// Health check endpoint - expose for monitoring systems
app.get('/health/db', async (req, res) => {
  const health = await checkPoolHealth();
  res.status(health.healthy ? 200 : 503).json({
    ...health,
    pool: {
      total: pool.totalCount,     // Total connections in pool
      idle: pool.idleCount,       // Available connections
      waiting: pool.waitingCount, // Queries waiting for a connection
    },
  });
});
```

### Pool Metrics for Observability

These Prometheus metrics provide visibility into pool performance and help identify connection bottlenecks. High waiting counts or query durations indicate the need for pool tuning or database optimization.

```javascript
const prometheus = require('prom-client');

// Create metrics for pool monitoring
const poolTotalGauge = new prometheus.Gauge({
  name: 'pg_pool_connections_total',
  help: 'Total number of connections in the pool',
});

const poolIdleGauge = new prometheus.Gauge({
  name: 'pg_pool_connections_idle',
  help: 'Number of idle connections in the pool',
});

const poolWaitingGauge = new prometheus.Gauge({
  name: 'pg_pool_clients_waiting',
  help: 'Number of clients waiting for a connection',
});

// Histogram for query duration distribution
const queryDuration = new prometheus.Histogram({
  name: 'pg_query_duration_seconds',
  help: 'PostgreSQL query duration in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5], // Buckets from 1ms to 5s
});

// Update metrics periodically - 5 second interval is reasonable
setInterval(() => {
  poolTotalGauge.set(pool.totalCount);
  poolIdleGauge.set(pool.idleCount);
  poolWaitingGauge.set(pool.waitingCount);
}, 5000);

// Wrap queries to measure duration for observability
async function timedQuery(text, params) {
  const start = Date.now();
  try {
    return await pool.query(text, params);
  } finally {
    const duration = (Date.now() - start) / 1000;
    queryDuration.observe(duration);  // Record query duration
  }
}
```

## MySQL Connection Pooling with mysql2

### Basic Pool Setup

The mysql2/promise module provides async/await support for MySQL. This configuration creates a pool with connection lifecycle management and TCP keep-alive to prevent stale connections.

```javascript
const mysql = require('mysql2/promise');

// Create a connection pool with production settings
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool configuration
  connectionLimit: 20,         // Maximum connections in pool
  queueLimit: 0,               // Unlimited queue (0 = no limit)
  waitForConnections: true,    // Wait for available connection instead of failing
  enableKeepAlive: true,       // Enable TCP keep-alive to detect dead connections
  keepAliveInitialDelay: 30000, // Keep-alive delay in milliseconds

  // Timeouts
  connectTimeout: 10000,       // Connection establishment timeout
  acquireTimeout: 10000,       // Time to wait for connection from pool
});

module.exports = pool;
```

### Query Execution Patterns

Similar to pg, mysql2 supports direct queries and dedicated connections for transactions. Use pool.execute() for parameterized queries to leverage prepared statements for better security and performance.

```javascript
// Simple query - pool.execute uses prepared statements for security
async function getUser(id) {
  // execute() parameterizes the query, preventing SQL injection
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',  // ? is a parameterized placeholder
    [id]
  );
  return rows[0];
}

// Transaction with dedicated connection - required for multi-query atomicity
async function transferFunds(fromId, toId, amount) {
  // Get dedicated connection for transaction
  const connection = await pool.getConnection();

  try {
    // Start transaction
    await connection.beginTransaction();

    // Execute queries within transaction
    await connection.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, fromId]
    );

    await connection.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, toId]
    );

    // Commit if all queries succeed
    await connection.commit();
  } catch (error) {
    // Rollback on any error
    await connection.rollback();
    throw error;
  } finally {
    // CRITICAL: Always release connection back to pool
    connection.release();
  }
}
```

### Handling Connection Failures

This resilient pool wrapper automatically handles connection failures with exponential backoff retry logic. It monitors connection events and rebuilds the pool when the database becomes unreachable.

```javascript
const mysql = require('mysql2/promise');

// Resilient pool wrapper with automatic reconnection
class ResilientPool {
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.reconnecting = false;  // Prevent multiple reconnection attempts
    this.createPool();
  }

  createPool() {
    this.pool = mysql.createPool({
      ...this.config,
      // Handle connection errors gracefully
      waitForConnections: true,
    });

    // Monitor for pool errors and connection events
    this.pool.on('connection', (connection) => {
      console.log('New connection established');

      // Handle individual connection errors
      connection.on('error', (err) => {
        console.error('Connection error:', err);
        // PROTOCOL_CONNECTION_LOST means MySQL server closed the connection
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          this.handleDisconnect();
        }
      });
    });
  }

  async handleDisconnect() {
    // Prevent multiple simultaneous reconnection attempts
    if (this.reconnecting) return;
    this.reconnecting = true;

    console.log('Attempting to reconnect to MySQL...');

    // Exponential backoff - start at 1s, max 30s
    let delay = 1000;
    const maxDelay = 30000;

    while (true) {
      try {
        await this.pool.end();  // Close existing pool
        this.createPool();       // Create new pool

        // Test connection to verify reconnection succeeded
        const [rows] = await this.pool.execute('SELECT 1');
        console.log('Reconnected to MySQL');
        this.reconnecting = false;
        break;
      } catch (error) {
        console.error(`Reconnection failed, retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, maxDelay);  // Exponential backoff with cap
      }
    }
  }

  // Proxy methods to underlying pool
  async query(sql, params) {
    return this.pool.execute(sql, params);
  }

  async getConnection() {
    return this.pool.getConnection();
  }
}

// Export singleton instance
module.exports = new ResilientPool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionLimit: 20,
});
```

## Advanced Pooling Patterns

### Read/Write Splitting

This pattern distributes read queries across replicas while routing writes to the primary database. It improves read scalability and reduces load on the primary server.

```javascript
// Database cluster with read/write splitting
class DatabaseCluster {
  constructor() {
    // Primary for writes - single source of truth
    this.primary = new Pool({
      host: process.env.DB_PRIMARY_HOST,
      // ... other config
    });

    // Replicas for reads - can add more for scalability
    this.replicas = [
      new Pool({ host: process.env.DB_REPLICA_1_HOST }),
      new Pool({ host: process.env.DB_REPLICA_2_HOST }),
    ];

    this.replicaIndex = 0;  // For round-robin selection
  }

  // Round-robin replica selection for load distribution
  getReadPool() {
    const pool = this.replicas[this.replicaIndex];
    this.replicaIndex = (this.replicaIndex + 1) % this.replicas.length;
    return pool;
  }

  // Read queries go to replicas
  async read(sql, params) {
    return this.getReadPool().query(sql, params);
  }

  // Write queries go to primary
  async write(sql, params) {
    return this.primary.query(sql, params);
  }

  // Transactions must use primary to ensure consistency
  async transaction(fn) {
    const client = await this.primary.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### Connection Pool per Tenant

For multi-tenant applications, separate pools per tenant provide isolation and enable tenant-specific connection limits. This prevents one tenant from monopolizing database resources.

```javascript
// Multi-tenant pool manager - one pool per tenant
class TenantPoolManager {
  constructor(baseConfig) {
    this.baseConfig = baseConfig;
    this.pools = new Map();  // Tenant ID -> Pool
  }

  // Get or create pool for a tenant
  getPool(tenantId) {
    if (!this.pools.has(tenantId)) {
      // Create dedicated pool for this tenant
      const pool = new Pool({
        ...this.baseConfig,
        database: `tenant_${tenantId}`,  // Each tenant has its own database
        max: 5, // Smaller pool per tenant to limit total connections
      });

      this.pools.set(tenantId, pool);
    }

    return this.pools.get(tenantId);
  }

  // Execute query for a specific tenant
  async query(tenantId, sql, params) {
    const pool = this.getPool(tenantId);
    return pool.query(sql, params);
  }

  // Clean up pool when tenant is removed or inactive
  async closePool(tenantId) {
    const pool = this.pools.get(tenantId);
    if (pool) {
      await pool.end();
      this.pools.delete(tenantId);
    }
  }

  // Graceful shutdown - close all tenant pools
  async closeAll() {
    const promises = [];
    for (const pool of this.pools.values()) {
      promises.push(pool.end());
    }
    await Promise.all(promises);
    this.pools.clear();
  }
}
```

### Query Queue with Backpressure

This pattern prevents database overload by implementing backpressure when the query queue grows too large. It protects both your application and database from cascade failures during traffic spikes.

```javascript
// Query queue with backpressure to prevent database overload
class QueuedPool {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.maxQueueSize = options.maxQueueSize || 1000;  // Maximum pending queries
    this.queueTimeout = options.queueTimeout || 30000;  // Queue wait timeout
    this.queue = [];
    this.processing = false;
  }

  async query(sql, params) {
    // Backpressure: reject new queries when queue is full
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Query queue full - backpressure applied');
    }

    return new Promise((resolve, reject) => {
      // Set timeout for queued queries
      const timeout = setTimeout(() => {
        const index = this.queue.findIndex(q => q.resolve === resolve);
        if (index > -1) {
          this.queue.splice(index, 1);
          reject(new Error('Query timed out waiting in queue'));
        }
      }, this.queueTimeout);

      // Add query to queue
      this.queue.push({
        sql,
        params,
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      this.processQueue();  // Start processing if not already
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      // Check pool availability - pause if too many waiting
      if (this.pool.waitingCount > this.pool.totalCount) {
        // Too many waiting, pause processing to let pool catch up
        await new Promise(r => setTimeout(r, 100));
        continue;
      }

      const { sql, params, resolve, reject } = this.queue.shift();

      try {
        const result = await this.pool.query(sql, params);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }
}
```

## Graceful Shutdown

Proper shutdown handling ensures all in-flight queries complete before closing connections. This prevents data corruption and connection leaks during deployments or restarts.

```javascript
const pool = new Pool({ /* config */ });

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log('Shutting down database connections...');

  // Stop accepting new queries
  // (In a real app, stop accepting HTTP requests first)

  // Wait for active queries to complete (with timeout)
  const timeout = 30000; // 30 seconds maximum wait
  const start = Date.now();

  // Wait until all connections are idle
  while (pool.totalCount > pool.idleCount) {
    if (Date.now() - start > timeout) {
      console.warn('Timeout waiting for queries to complete');
      break;
    }
    await new Promise(r => setTimeout(r, 100));  // Check every 100ms
  }

  // Close all connections
  await pool.end();
  console.log('Database connections closed');
}

// Register shutdown handlers for graceful termination
process.on('SIGTERM', gracefulShutdown);  // Kubernetes/Docker termination
process.on('SIGINT', gracefulShutdown);   // Ctrl+C
```

## Pool Configuration Recommendations

| Setting | Development | Production | High-Traffic |
|---------|-------------|------------|--------------|
| **max** | 5 | 20 | 50-100 |
| **min** | 1 | 5 | 10 |
| **idleTimeout** | 10s | 30s | 60s |
| **connectionTimeout** | 10s | 5s | 3s |
| **maxUses** | - | 7500 | 5000 |

## Summary

| Aspect | Best Practice |
|--------|---------------|
| **Pool Size** | Match to database capacity / app instances |
| **Timeouts** | Set connection and query timeouts |
| **Health Checks** | Periodic validation with `/health/db` endpoint |
| **Metrics** | Export pool stats to observability platform |
| **Error Handling** | Implement reconnection with exponential backoff |
| **Shutdown** | Drain pool gracefully on SIGTERM |
| **Transactions** | Always release connections in finally block |

Connection pooling is essential for Node.js database performance at scale. The right pool configuration prevents connection exhaustion, reduces latency, and keeps your application responsive under load.
