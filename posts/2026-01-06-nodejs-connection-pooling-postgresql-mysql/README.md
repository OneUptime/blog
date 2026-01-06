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

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool configuration
  max: 20,                    // Maximum connections in pool
  min: 5,                     // Minimum connections to maintain
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
  maxUses: 7500,              // Close connection after 7500 queries
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
```

### Query Execution Patterns

```javascript
// Simple query - pool manages connection automatically
async function getUser(id) {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

// Multiple queries - get a dedicated client
async function transferFunds(fromId, toId, amount) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );

    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // CRITICAL: Always release the client back to the pool
    client.release();
  }
}
```

### Pool Sizing Strategy

```javascript
// Calculate optimal pool size
function calculatePoolSize() {
  // PostgreSQL recommendation: connections = (core_count * 2) + effective_spindle_count
  // For SSDs, effective_spindle_count is typically 1

  const cpuCount = require('os').cpus().length;
  const dbCpuCount = parseInt(process.env.DB_CPU_COUNT) || 4;

  // Optimal for the database server
  const optimalDbConnections = (dbCpuCount * 2) + 1;

  // Divide among application instances
  const appInstanceCount = parseInt(process.env.APP_INSTANCE_COUNT) || 1;

  return Math.floor(optimalDbConnections / appInstanceCount);
}

const pool = new Pool({
  max: calculatePoolSize(),
  // ... other options
});
```

### Connection Health Checks

```javascript
const pool = new Pool({
  // ... connection options

  // Validate connections before use
  query_timeout: 30000, // 30 second query timeout
});

// Periodic health check
async function checkPoolHealth() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

// Health check endpoint
app.get('/health/db', async (req, res) => {
  const health = await checkPoolHealth();
  res.status(health.healthy ? 200 : 503).json({
    ...health,
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
  });
});
```

### Pool Metrics for Observability

```javascript
const prometheus = require('prom-client');

// Create metrics
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

const queryDuration = new prometheus.Histogram({
  name: 'pg_query_duration_seconds',
  help: 'PostgreSQL query duration in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

// Update metrics periodically
setInterval(() => {
  poolTotalGauge.set(pool.totalCount);
  poolIdleGauge.set(pool.idleCount);
  poolWaitingGauge.set(pool.waitingCount);
}, 5000);

// Wrap queries to measure duration
async function timedQuery(text, params) {
  const start = Date.now();
  try {
    return await pool.query(text, params);
  } finally {
    const duration = (Date.now() - start) / 1000;
    queryDuration.observe(duration);
  }
}
```

## MySQL Connection Pooling with mysql2

### Basic Pool Setup

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool configuration
  connectionLimit: 20,         // Maximum connections
  queueLimit: 0,               // Unlimited queue (0 = no limit)
  waitForConnections: true,    // Wait for available connection
  enableKeepAlive: true,       // Enable TCP keep-alive
  keepAliveInitialDelay: 30000, // Keep-alive delay

  // Timeouts
  connectTimeout: 10000,       // Connection timeout
  acquireTimeout: 10000,       // Time to wait for connection from pool
});

module.exports = pool;
```

### Query Execution Patterns

```javascript
// Simple query
async function getUser(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  return rows[0];
}

// Transaction with dedicated connection
async function transferFunds(fromId, toId, amount) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, fromId]
    );

    await connection.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, toId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

### Handling Connection Failures

```javascript
const mysql = require('mysql2/promise');

class ResilientPool {
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.reconnecting = false;
    this.createPool();
  }

  createPool() {
    this.pool = mysql.createPool({
      ...this.config,
      // Handle connection errors
      waitForConnections: true,
    });

    // Monitor for pool errors
    this.pool.on('connection', (connection) => {
      console.log('New connection established');

      connection.on('error', (err) => {
        console.error('Connection error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          this.handleDisconnect();
        }
      });
    });
  }

  async handleDisconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;

    console.log('Attempting to reconnect to MySQL...');

    // Exponential backoff
    let delay = 1000;
    const maxDelay = 30000;

    while (true) {
      try {
        await this.pool.end();
        this.createPool();

        // Test connection
        const [rows] = await this.pool.execute('SELECT 1');
        console.log('Reconnected to MySQL');
        this.reconnecting = false;
        break;
      } catch (error) {
        console.error(`Reconnection failed, retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  async query(sql, params) {
    return this.pool.execute(sql, params);
  }

  async getConnection() {
    return this.pool.getConnection();
  }
}

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

```javascript
class DatabaseCluster {
  constructor() {
    // Primary for writes
    this.primary = new Pool({
      host: process.env.DB_PRIMARY_HOST,
      // ... other config
    });

    // Replicas for reads
    this.replicas = [
      new Pool({ host: process.env.DB_REPLICA_1_HOST }),
      new Pool({ host: process.env.DB_REPLICA_2_HOST }),
    ];

    this.replicaIndex = 0;
  }

  // Round-robin replica selection
  getReadPool() {
    const pool = this.replicas[this.replicaIndex];
    this.replicaIndex = (this.replicaIndex + 1) % this.replicas.length;
    return pool;
  }

  async read(sql, params) {
    return this.getReadPool().query(sql, params);
  }

  async write(sql, params) {
    return this.primary.query(sql, params);
  }

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

```javascript
class TenantPoolManager {
  constructor(baseConfig) {
    this.baseConfig = baseConfig;
    this.pools = new Map();
  }

  getPool(tenantId) {
    if (!this.pools.has(tenantId)) {
      const pool = new Pool({
        ...this.baseConfig,
        database: `tenant_${tenantId}`,
        max: 5, // Smaller pool per tenant
      });

      this.pools.set(tenantId, pool);
    }

    return this.pools.get(tenantId);
  }

  async query(tenantId, sql, params) {
    const pool = this.getPool(tenantId);
    return pool.query(sql, params);
  }

  async closePool(tenantId) {
    const pool = this.pools.get(tenantId);
    if (pool) {
      await pool.end();
      this.pools.delete(tenantId);
    }
  }

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

```javascript
class QueuedPool {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.queueTimeout = options.queueTimeout || 30000;
    this.queue = [];
    this.processing = false;
  }

  async query(sql, params) {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Query queue full - backpressure applied');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.queue.findIndex(q => q.resolve === resolve);
        if (index > -1) {
          this.queue.splice(index, 1);
          reject(new Error('Query timed out waiting in queue'));
        }
      }, this.queueTimeout);

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

      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      // Check pool availability
      if (this.pool.waitingCount > this.pool.totalCount) {
        // Too many waiting, pause processing
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

```javascript
const pool = new Pool({ /* config */ });

async function gracefulShutdown() {
  console.log('Shutting down database connections...');

  // Stop accepting new queries
  // (In a real app, stop accepting HTTP requests first)

  // Wait for active queries to complete (with timeout)
  const timeout = 30000; // 30 seconds
  const start = Date.now();

  while (pool.totalCount > pool.idleCount) {
    if (Date.now() - start > timeout) {
      console.warn('Timeout waiting for queries to complete');
      break;
    }
    await new Promise(r => setTimeout(r, 100));
  }

  // Close all connections
  await pool.end();
  console.log('Database connections closed');
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
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
