# How to Optimize Database Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, Performance, PostgreSQL, MySQL, Backend

Description: Learn how to optimize database connections for better performance. This guide covers connection pooling, prepared statements, connection lifecycle management, and monitoring techniques.

---

Database connections are expensive resources. Each connection consumes memory on both the application server and the database server, requires authentication overhead, and occupies a slot in the database's connection limit. Applications that create connections carelessly suffer from connection exhaustion, increased latency, and wasted resources.

This guide covers practical techniques for optimizing database connections across different languages and databases.

## Understanding Connection Costs

```mermaid
sequenceDiagram
    participant App
    participant DB

    Note over App,DB: Connection Establishment
    App->>DB: TCP Handshake (1 RTT)
    App->>DB: TLS Handshake (2 RTT)
    App->>DB: Authentication
    DB->>App: Connection Ready

    Note over App,DB: ~50-200ms total
```

| Connection Phase | Typical Latency |
|------------------|-----------------|
| TCP handshake | 1-10ms |
| TLS handshake | 10-50ms |
| Authentication | 5-20ms |
| **Total overhead** | **20-100ms per connection** |

## Connection Pool Sizing

The optimal pool size depends on your workload, not the number of application instances.

### Formula for Pool Size

```
connections = (core_count * 2) + effective_spindle_count
```

For modern SSDs with 4 CPU cores:
- connections = (4 * 2) + 1 = 9 (round to 10)

### PostgreSQL Connection Configuration

```sql
-- Check current connection settings
SHOW max_connections;
SHOW superuser_reserved_connections;

-- Check active connections
SELECT
    datname,
    usename,
    state,
    count(*) as connection_count
FROM pg_stat_activity
GROUP BY datname, usename, state
ORDER BY connection_count DESC;

-- Recommended postgresql.conf settings
-- max_connections = 200  -- Depends on available RAM
-- shared_buffers = 256MB -- 25% of RAM for dedicated DB server
-- work_mem = 4MB         -- Per-operation memory
```

### Application Pool Configuration

```javascript
// Node.js with pg-pool
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool settings
  max: 10,                          // Maximum connections
  min: 2,                           // Minimum connections to maintain

  // Connection lifecycle
  idleTimeoutMillis: 30000,         // Close idle connections after 30s
  connectionTimeoutMillis: 10000,   // Fail if can't connect in 10s

  // Statement timeout (prevent runaway queries)
  statement_timeout: 30000,         // 30 second query timeout

  // Application name for pg_stat_activity
  application_name: 'my-api-server'
});

// Monitor pool health
setInterval(() => {
  console.log('Pool stats:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
}, 60000);
```

```python
# Python with SQLAlchemy
from sqlalchemy import create_engine, event
from sqlalchemy.pool import QueuePool
import logging

# Configure engine with optimized pool settings
engine = create_engine(
    'postgresql://user:password@localhost/dbname',

    # Pool configuration
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=1800,  # Recycle connections every 30 minutes
    pool_pre_ping=True, # Verify connections before use

    # Connection arguments
    connect_args={
        'connect_timeout': 10,
        'application_name': 'my-api-server',
        'options': '-c statement_timeout=30000'
    }
)

# Log slow checkouts (indicates pool exhaustion)
@event.listens_for(engine, 'checkout')
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    connection_record.info['checkout_time'] = time.time()

@event.listens_for(engine, 'checkin')
def receive_checkin(dbapi_connection, connection_record):
    checkout_time = connection_record.info.get('checkout_time')
    if checkout_time:
        duration = time.time() - checkout_time
        if duration > 1.0:  # Connection held for more than 1 second
            logging.warning(f'Connection held for {duration:.2f}s')
```

## Prepared Statements

Prepared statements reduce query parsing overhead and prevent SQL injection.

```javascript
// Node.js - Named prepared statements
const { Pool } = require('pg');
const pool = new Pool();

// Define prepared statements
const queries = {
  getUserById: {
    name: 'get-user-by-id',
    text: 'SELECT * FROM users WHERE id = $1',
  },
  getUserOrders: {
    name: 'get-user-orders',
    text: `
      SELECT o.*, array_agg(oi.*) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `,
  },
  insertOrder: {
    name: 'insert-order',
    text: 'INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING *',
  }
};

// Use prepared statements
async function getUserById(userId) {
  const result = await pool.query(queries.getUserById, [userId]);
  return result.rows[0];
}

async function getUserOrders(userId, limit = 10, offset = 0) {
  const result = await pool.query(queries.getUserOrders, [userId, limit, offset]);
  return result.rows;
}

// Batch operations with prepared statements
async function insertOrderWithItems(userId, items) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Insert order
    const orderResult = await client.query(queries.insertOrder, [userId, total, 'pending']);
    const order = orderResult.rows[0];

    // Batch insert items using prepared statement
    const insertItemQuery = {
      name: 'insert-order-item',
      text: 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)'
    };

    for (const item of items) {
      await client.query(insertItemQuery, [order.id, item.productId, item.quantity, item.price]);
    }

    await client.query('COMMIT');
    return order;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

```python
# Python - Prepared statements with psycopg2
import psycopg2
from psycopg2 import sql

class QueryManager:
    def __init__(self, connection):
        self.conn = connection
        self.prepared = {}

    def prepare(self, name, query):
        """Prepare a statement for repeated execution."""
        with self.conn.cursor() as cur:
            # PostgreSQL PREPARE syntax
            cur.execute(
                sql.SQL("PREPARE {} AS {}").format(
                    sql.Identifier(name),
                    sql.SQL(query)
                )
            )
            self.prepared[name] = True

    def execute_prepared(self, name, params):
        """Execute a prepared statement."""
        with self.conn.cursor() as cur:
            # PostgreSQL EXECUTE syntax
            placeholders = ', '.join(['%s'] * len(params))
            cur.execute(f"EXECUTE {name}({placeholders})", params)
            return cur.fetchall()

    def deallocate(self, name):
        """Deallocate a prepared statement."""
        if name in self.prepared:
            with self.conn.cursor() as cur:
                cur.execute(f"DEALLOCATE {name}")
            del self.prepared[name]


# Usage
conn = psycopg2.connect(dsn)
qm = QueryManager(conn)

# Prepare statements once
qm.prepare('get_user', 'SELECT * FROM users WHERE id = $1')
qm.prepare('get_orders', 'SELECT * FROM orders WHERE user_id = $1 LIMIT $2')

# Execute many times with different parameters
user = qm.execute_prepared('get_user', [123])
orders = qm.execute_prepared('get_orders', [123, 10])
```

## Connection Lifecycle Management

### Graceful Connection Handling

```javascript
// Proper connection acquisition and release
async function executeQuery(queryFn) {
  const client = await pool.connect();

  try {
    return await queryFn(client);
  } finally {
    // Always release, even on error
    client.release();
  }
}

// Usage
const users = await executeQuery(async (client) => {
  const result = await client.query('SELECT * FROM users WHERE active = true');
  return result.rows;
});

// Transaction wrapper
async function executeTransaction(transactionFn) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await transactionFn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Usage
const order = await executeTransaction(async (client) => {
  const orderResult = await client.query(
    'INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *',
    [userId, total]
  );

  await client.query(
    'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2',
    [quantity, productId]
  );

  return orderResult.rows[0];
});
```

### Connection Health Checks

```python
# Implement connection health checks
import psycopg2
from psycopg2 import pool
import threading
import time

class HealthCheckedPool:
    def __init__(self, dsn, minconn=2, maxconn=10):
        self.dsn = dsn
        self.pool = pool.ThreadedConnectionPool(minconn, maxconn, dsn)
        self.health_check_interval = 30
        self._start_health_checker()

    def _start_health_checker(self):
        def check_health():
            while True:
                time.sleep(self.health_check_interval)
                self._check_connections()

        thread = threading.Thread(target=check_health, daemon=True)
        thread.start()

    def _check_connections(self):
        """Check and refresh unhealthy connections."""
        # Get all connections from pool
        # This is a simplified example
        try:
            conn = self.pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute('SELECT 1')
            except psycopg2.Error:
                # Connection is dead, close it
                self.pool.putconn(conn, close=True)
            else:
                self.pool.putconn(conn)
        except pool.PoolError:
            pass

    def get_connection(self):
        conn = self.pool.getconn()

        # Verify connection is alive
        try:
            with conn.cursor() as cur:
                cur.execute('SELECT 1')
        except psycopg2.Error:
            # Get a fresh connection
            self.pool.putconn(conn, close=True)
            conn = self.pool.getconn()

        return conn

    def return_connection(self, conn, error=False):
        if error:
            self.pool.putconn(conn, close=True)
        else:
            self.pool.putconn(conn)

    def close_all(self):
        self.pool.closeall()
```

## Monitoring Database Connections

### PostgreSQL Monitoring Queries

```sql
-- Active connections by state
SELECT
    state,
    count(*) as count,
    array_agg(DISTINCT application_name) as applications
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Long-running queries
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state != 'idle'
ORDER BY duration DESC;

-- Waiting connections (blocked by locks)
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Connection pool effectiveness
SELECT
    application_name,
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'idle') as idle,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name
ORDER BY total_connections DESC;
```

### Application Metrics

```javascript
const prometheus = require('prom-client');

// Create metrics
const poolMetrics = {
  totalConnections: new prometheus.Gauge({
    name: 'db_pool_connections_total',
    help: 'Total number of connections in pool'
  }),
  idleConnections: new prometheus.Gauge({
    name: 'db_pool_connections_idle',
    help: 'Number of idle connections in pool'
  }),
  waitingRequests: new prometheus.Gauge({
    name: 'db_pool_waiting_requests',
    help: 'Number of requests waiting for connection'
  }),
  queryDuration: new prometheus.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
  }),
  connectionErrors: new prometheus.Counter({
    name: 'db_connection_errors_total',
    help: 'Total connection errors'
  })
};

// Update metrics periodically
setInterval(() => {
  poolMetrics.totalConnections.set(pool.totalCount);
  poolMetrics.idleConnections.set(pool.idleCount);
  poolMetrics.waitingRequests.set(pool.waitingCount);
}, 5000);

// Wrap queries with timing
async function timedQuery(text, params) {
  const end = poolMetrics.queryDuration.startTimer();
  try {
    return await pool.query(text, params);
  } finally {
    end();
  }
}

// Track connection errors
pool.on('error', (err) => {
  poolMetrics.connectionErrors.inc();
  console.error('Pool error:', err);
});
```

## Summary

Database connection optimization requires attention to pool sizing, connection lifecycle, and monitoring.

| Optimization | Impact | Effort |
|--------------|--------|--------|
| Connection pooling | High | Low |
| Pool size tuning | Medium | Medium |
| Prepared statements | Medium | Low |
| Connection health checks | Low | Medium |
| Query timeouts | High | Low |
| Monitoring | Medium | Medium |

Start with connection pooling if you do not have it, then tune pool sizes based on your workload. Add prepared statements for frequently executed queries, and always implement monitoring to catch connection issues before they become outages.
