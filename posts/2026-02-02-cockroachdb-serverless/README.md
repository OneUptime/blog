# How to Use CockroachDB Serverless

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Serverless, Database, SQL, Cloud, PostgreSQL, Distributed Database

Description: A comprehensive guide to using CockroachDB Serverless for scalable, distributed SQL databases. Learn cluster setup, connection management, schema design, query optimization, and best practices for production workloads.

---

CockroachDB Serverless offers the power of a distributed SQL database without the operational overhead of managing clusters. You get automatic scaling, built-in resilience, and PostgreSQL compatibility - all with a consumption-based pricing model that scales from zero to massive workloads.

## Why CockroachDB Serverless?

Traditional databases force you to choose between operational simplicity and distributed capabilities. CockroachDB Serverless eliminates that tradeoff:

| Feature | CockroachDB Serverless | Traditional PostgreSQL | Managed Cloud SQL |
| --- | --- | --- | --- |
| **Auto-scaling** | Yes, to zero | No | Limited |
| **Multi-region** | Built-in | Manual setup | Vendor-specific |
| **PostgreSQL compatible** | Yes | Native | Yes |
| **Pay-per-use** | Yes | Fixed cost | Partial |
| **Distributed transactions** | Yes | No | Limited |

## Architecture Overview

CockroachDB Serverless abstracts away cluster management while maintaining the distributed nature of CockroachDB.

```mermaid
flowchart TB
    subgraph Client["Your Application"]
        App[Application Code]
    end

    subgraph Serverless["CockroachDB Serverless"]
        LB[Load Balancer]
        subgraph Compute["Compute Layer"]
            SQL1[SQL Gateway 1]
            SQL2[SQL Gateway 2]
            SQL3[SQL Gateway N]
        end
        subgraph Storage["Storage Layer"]
            KV1[(KV Store 1)]
            KV2[(KV Store 2)]
            KV3[(KV Store N)]
        end
    end

    App --> LB
    LB --> SQL1
    LB --> SQL2
    LB --> SQL3
    SQL1 --> KV1
    SQL1 --> KV2
    SQL2 --> KV2
    SQL2 --> KV3
    SQL3 --> KV1
    SQL3 --> KV3
```

## Getting Started

### Creating Your First Cluster

Sign up at [cockroachlabs.com](https://cockroachlabs.com) and create a serverless cluster. The free tier provides 10 GiB of storage and 50M Request Units per month.

After cluster creation, download your connection string. It follows the PostgreSQL format with CockroachDB-specific parameters.

```bash
# Connection string format from the CockroachDB Cloud Console
# The sslmode and sslrootcert parameters ensure encrypted connections
cockroach sql --url "postgresql://username:password@free-tier.gcp-us-central1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full"
```

### Connecting from Node.js

Install the PostgreSQL driver since CockroachDB is wire-compatible with PostgreSQL.

```javascript
// Install: npm install pg
// The pg library works seamlessly with CockroachDB due to PostgreSQL wire compatibility

const { Pool } = require('pg');

// Create a connection pool for efficient connection reuse
// Connection pooling is essential for serverless workloads to minimize cold start latency
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
  },
  // Serverless-optimized settings
  max: 10,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout for new connections
});

// Execute a simple query to verify connectivity
async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT now() as current_time');
    console.log('Connected at:', result.rows[0].current_time);
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

testConnection();
```

### Connecting from Python

Python applications can use psycopg2 or the newer psycopg3 driver.

```python
# Install: pip install psycopg2-binary
# The psycopg2 library provides robust PostgreSQL connectivity for CockroachDB

import os
import psycopg2
from psycopg2 import pool

# Create a connection pool for handling concurrent requests
# Pool size should match your application's concurrency requirements
connection_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    dsn=os.environ['DATABASE_URL'],
    sslmode='verify-full'
)

def execute_query(query, params=None):
    """
    Execute a query using a connection from the pool.
    Always returns connections to the pool to prevent exhaustion.
    """
    conn = connection_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            if cur.description:
                return cur.fetchall()
            conn.commit()
    finally:
        # Return connection to pool even if an error occurs
        connection_pool.putconn(conn)

# Test the connection
result = execute_query("SELECT version()")
print(f"CockroachDB version: {result[0][0]}")
```

### Connecting from Go

Go applications benefit from the pgx driver, which offers better performance than the standard library.

```go
// Install: go get github.com/jackc/pgx/v5
// pgx provides high-performance PostgreSQL connectivity with CockroachDB optimizations

package main

import (
    "context"
    "fmt"
    "os"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

func main() {
    // Parse the connection string and configure pool settings
    // Pool configuration is critical for serverless performance
    config, err := pgxpool.ParseConfig(os.Getenv("DATABASE_URL"))
    if err != nil {
        panic(err)
    }

    // Configure pool for serverless workloads
    config.MaxConns = 10
    config.MinConns = 2
    config.MaxConnLifetime = time.Hour
    config.MaxConnIdleTime = 30 * time.Minute

    // Create the connection pool
    pool, err := pgxpool.NewWithConfig(context.Background(), config)
    if err != nil {
        panic(err)
    }
    defer pool.Close()

    // Test connectivity with a simple query
    var greeting string
    err = pool.QueryRow(context.Background(), "SELECT 'Hello from CockroachDB!'").Scan(&greeting)
    if err != nil {
        panic(err)
    }
    fmt.Println(greeting)
}
```

## Schema Design for Distributed Systems

CockroachDB distributes data across nodes using ranges. Proper schema design ensures even data distribution and optimal query performance.

### Primary Key Strategy

Avoid sequential primary keys that create write hotspots. Use UUIDs or hash-sharded indexes instead.

```sql
-- Bad: Sequential IDs create write hotspots on a single range
-- All inserts go to the same node, creating a bottleneck
CREATE TABLE orders_bad (
    id SERIAL PRIMARY KEY,
    customer_id UUID NOT NULL,
    total DECIMAL(10,2)
);

-- Good: UUID primary keys distribute writes across all nodes
-- gen_random_uuid() generates random UUIDs that spread evenly
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    total DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Alternative: Hash-sharded index for sequential requirements
-- Use when you need sequential IDs but want distributed writes
CREATE TABLE events (
    id INT PRIMARY KEY DEFAULT unique_rowid(),
    event_type STRING NOT NULL,
    payload JSONB,
    INDEX events_by_id_hash (id) USING HASH WITH (bucket_count = 8)
);
```

### Multi-Region Table Design

CockroachDB Serverless supports multi-region configurations for global applications.

```sql
-- Configure the database for multi-region operation
-- Regions must be enabled at the cluster level first
ALTER DATABASE myapp SET PRIMARY REGION = "us-east1";
ALTER DATABASE myapp ADD REGION "us-west2";
ALTER DATABASE myapp ADD REGION "eu-west1";

-- Create a global table for data that changes infrequently
-- Global tables replicate to all regions for fast local reads
CREATE TABLE countries (
    code STRING PRIMARY KEY,
    name STRING NOT NULL,
    currency STRING
) LOCALITY GLOBAL;

-- Create a regional table for user data
-- Data stays in the user's home region for compliance and performance
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email STRING UNIQUE NOT NULL,
    region crdb_internal_region NOT NULL,
    profile JSONB
) LOCALITY REGIONAL BY ROW AS region;

-- Insert user data with explicit region assignment
-- The region column determines where data physically resides
INSERT INTO users (email, region, profile)
VALUES ('alice@example.com', 'us-east1', '{"name": "Alice"}');
```

## Transaction Patterns

CockroachDB provides serializable isolation by default, ensuring strong consistency across distributed transactions.

### Basic Transaction Pattern

Always use explicit transactions for multi-statement operations.

```javascript
// Wrap related operations in transactions to ensure atomicity
// CockroachDB will automatically retry serialization conflicts

async function transferFunds(fromAccountId, toAccountId, amount) {
  const client = await pool.connect();

  try {
    // Begin an explicit transaction
    await client.query('BEGIN');

    // Deduct from source account
    // The WHERE clause ensures sufficient balance
    const deductResult = await client.query(
      `UPDATE accounts
       SET balance = balance - $1
       WHERE id = $2 AND balance >= $1
       RETURNING balance`,
      [amount, fromAccountId]
    );

    if (deductResult.rowCount === 0) {
      throw new Error('Insufficient funds or account not found');
    }

    // Credit destination account
    await client.query(
      `UPDATE accounts
       SET balance = balance + $1
       WHERE id = $2`,
      [amount, toAccountId]
    );

    // Record the transfer for audit purposes
    await client.query(
      `INSERT INTO transfers (from_account, to_account, amount, transferred_at)
       VALUES ($1, $2, $3, now())`,
      [fromAccountId, toAccountId, amount]
    );

    // Commit only after all operations succeed
    await client.query('COMMIT');

    return { success: true, newBalance: deductResult.rows[0].balance };

  } catch (error) {
    // Rollback on any error to maintain consistency
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Handling Retry Errors

CockroachDB may return retry errors under contention. Implement exponential backoff for resilience.

```python
# Implement retry logic with exponential backoff
# Error code 40001 indicates a serialization conflict that should be retried

import time
import random
from psycopg2 import errors

def execute_with_retry(operation, max_retries=5):
    """
    Execute a database operation with automatic retry on serialization conflicts.
    Uses exponential backoff to reduce contention during retries.
    """
    for attempt in range(max_retries):
        try:
            return operation()
        except errors.SerializationFailure as e:
            if attempt == max_retries - 1:
                raise

            # Calculate exponential backoff with jitter
            # Jitter prevents thundering herd when multiple clients retry
            base_delay = 0.1 * (2 ** attempt)
            jitter = random.uniform(0, 0.1)
            sleep_time = base_delay + jitter

            print(f"Retry {attempt + 1}/{max_retries} after {sleep_time:.2f}s")
            time.sleep(sleep_time)

    raise Exception("Max retries exceeded")

# Example usage with a transaction
def update_inventory(product_id, quantity_change):
    def do_update():
        conn = connection_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("BEGIN")
                cur.execute(
                    """UPDATE inventory
                       SET quantity = quantity + %s
                       WHERE product_id = %s
                       RETURNING quantity""",
                    (quantity_change, product_id)
                )
                result = cur.fetchone()
                cur.execute("COMMIT")
                return result[0]
        except:
            conn.rollback()
            raise
        finally:
            connection_pool.putconn(conn)

    return execute_with_retry(do_update)
```

## Query Optimization

Understanding how CockroachDB executes queries helps you write performant SQL.

### Using EXPLAIN ANALYZE

Analyze query execution plans to identify bottlenecks.

```sql
-- EXPLAIN ANALYZE runs the query and shows actual execution statistics
-- Use this to understand index usage and identify full table scans

EXPLAIN ANALYZE
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at > now() - INTERVAL '7 days'
  AND o.total > 100
ORDER BY o.total DESC
LIMIT 10;

-- Output includes:
-- - Actual row counts at each step
-- - Time spent in each operation
-- - Index scans vs table scans
-- - Network round trips for distributed queries
```

### Indexing Strategies

Create indexes that match your query patterns. CockroachDB supports covering indexes to avoid table lookups.

```sql
-- Create a covering index for a common query pattern
-- Storing columns in the index avoids fetching from the primary table
CREATE INDEX idx_orders_customer_date ON orders (customer_id, created_at DESC)
  STORING (total, status);

-- Partial index for frequently filtered subsets
-- Only indexes active orders, reducing index size and maintenance cost
CREATE INDEX idx_active_orders ON orders (customer_id, created_at)
  WHERE status = 'active';

-- Expression index for computed values
-- Useful for case-insensitive searches or JSON field access
CREATE INDEX idx_users_email_lower ON users (lower(email));

-- Inverted index for JSONB columns
-- Enables efficient queries on JSON structure and values
CREATE INVERTED INDEX idx_events_payload ON events (payload);

-- Query using the inverted index
-- Finds all events where payload contains a specific nested value
SELECT * FROM events
WHERE payload @> '{"action": "purchase", "category": "electronics"}';
```

## Connection Management for Serverless

Serverless applications require careful connection management due to ephemeral compute instances.

```mermaid
sequenceDiagram
    participant App as Application
    participant Pool as Connection Pool
    participant LB as Load Balancer
    participant DB as CockroachDB Serverless

    App->>Pool: Request Connection
    alt Pool has idle connection
        Pool->>App: Return existing connection
    else Pool is empty
        Pool->>LB: Create new connection
        LB->>DB: Route to SQL gateway
        DB->>Pool: Connection established
        Pool->>App: Return new connection
    end
    App->>DB: Execute query
    DB->>App: Return results
    App->>Pool: Release connection
    Note over Pool: Connection stays open for reuse
```

### Connection Pooling Best Practices

Configure your connection pool to balance resource usage and performance.

```javascript
// Serverless-optimized connection pool configuration
// These settings prevent connection exhaustion while minimizing cold start impact

const poolConfig = {
  connectionString: process.env.DATABASE_URL,

  // SSL is required for CockroachDB Serverless
  ssl: { rejectUnauthorized: true },

  // Maximum connections - keep low to avoid exhausting serverless limits
  // CockroachDB Serverless has connection limits per cluster
  max: 5,

  // Minimum connections - set to 0 for true serverless scaling
  // Non-zero values keep connections warm but cost RUs when idle
  min: 0,

  // Close idle connections aggressively in serverless environments
  // Prevents orphaned connections when compute scales to zero
  idleTimeoutMillis: 10000,

  // Fail fast if connections are not available
  // Better to return an error than queue indefinitely
  connectionTimeoutMillis: 5000,

  // Enable connection health checks
  // Detects stale connections before using them
  allowExitOnIdle: true
};

// For AWS Lambda, Vercel, or similar platforms
// Use a module-level pool that persists across warm invocations
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool(poolConfig);

    // Handle pool errors to prevent unhandled rejections
    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
    });
  }
  return pool;
}

// Export a query helper that uses the shared pool
module.exports.query = async (text, params) => {
  const pool = getPool();
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error', { text, error: error.message });
    throw error;
  }
};
```

## Monitoring and Observability

CockroachDB Cloud provides built-in monitoring, but integrating with your observability stack gives deeper insights.

### Exporting Metrics

Use SQL queries to extract performance metrics for your monitoring system.

```sql
-- Query active sessions and their states
-- Useful for detecting connection leaks or long-running queries
SELECT
    application_name,
    client_address,
    state,
    query,
    age(now(), query_start) as query_duration
FROM crdb_internal.cluster_sessions
WHERE state != 'idle'
ORDER BY query_start;

-- Check table sizes and range distribution
-- Helps identify data skew and storage growth patterns
SELECT
    table_name,
    pg_size_pretty(sum(range_size_mb * 1024 * 1024)) as total_size,
    count(*) as range_count,
    avg(range_size_mb) as avg_range_size_mb
FROM crdb_internal.ranges_no_leases r
JOIN crdb_internal.tables t ON r.table_id = t.table_id
GROUP BY table_name
ORDER BY sum(range_size_mb) DESC
LIMIT 10;

-- Monitor transaction contention
-- High contention indicates need for schema or query optimization
SELECT
    key,
    txn_id,
    ts,
    duration
FROM crdb_internal.transaction_contention_events
WHERE duration > interval '100ms'
ORDER BY duration DESC
LIMIT 20;
```

### Application-Level Metrics

Instrument your application to track database performance.

```python
# Instrument database operations for observability
# Integrates with OpenTelemetry for distributed tracing

import time
from functools import wraps
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer(__name__)

def traced_query(operation_name):
    """
    Decorator that adds OpenTelemetry tracing to database operations.
    Captures query duration, row counts, and errors as span attributes.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            with tracer.start_as_current_span(f"db.{operation_name}") as span:
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    duration = time.time() - start_time

                    # Add success metrics to span
                    span.set_attribute("db.system", "cockroachdb")
                    span.set_attribute("db.operation", operation_name)
                    span.set_attribute("db.duration_ms", duration * 1000)

                    if hasattr(result, 'rowcount'):
                        span.set_attribute("db.rows_affected", result.rowcount)

                    span.set_status(Status(StatusCode.OK))
                    return result

                except Exception as e:
                    duration = time.time() - start_time

                    # Record error details in span
                    span.set_attribute("db.duration_ms", duration * 1000)
                    span.set_attribute("db.error", str(e))
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    raise
        return wrapper
    return decorator

# Apply tracing to database operations
@traced_query("get_user")
def get_user(user_id):
    return execute_query(
        "SELECT * FROM users WHERE id = %s",
        (user_id,)
    )

@traced_query("create_order")
def create_order(user_id, items, total):
    return execute_query(
        """INSERT INTO orders (user_id, items, total, created_at)
           VALUES (%s, %s, %s, now())
           RETURNING id""",
        (user_id, items, total)
    )
```

## Cost Optimization

CockroachDB Serverless charges based on Request Units (RUs). Understanding RU consumption helps control costs.

```mermaid
flowchart LR
    subgraph Operations["Operation Types"]
        R[Read Operations]
        W[Write Operations]
        S[Storage]
    end

    subgraph RU["Request Units"]
        R --> |"~1 RU per 4KB read"| RC[Read Cost]
        W --> |"~6 RU per 1KB write"| WC[Write Cost]
        S --> |"~1 RU per 1GB/month"| SC[Storage Cost]
    end

    subgraph Tips["Optimization"]
        RC --> T1[Use LIMIT clauses]
        RC --> T2[Create covering indexes]
        WC --> T3[Batch inserts]
        WC --> T4[Avoid wide rows]
        SC --> T5[Archive old data]
    end
```

### Cost-Efficient Query Patterns

Write queries that minimize RU consumption.

```sql
-- Inefficient: Fetches all columns when only a few are needed
-- Consumes RUs based on total data read
SELECT * FROM orders WHERE customer_id = $1;

-- Efficient: Only fetch required columns
-- Reduces RUs by limiting data transfer
SELECT id, total, status FROM orders WHERE customer_id = $1;

-- Inefficient: Unbounded query can return millions of rows
SELECT * FROM events WHERE event_type = 'pageview';

-- Efficient: Always use LIMIT and pagination
-- Cursor-based pagination is more efficient than OFFSET
SELECT id, payload, created_at
FROM events
WHERE event_type = 'pageview'
  AND created_at > $1  -- Cursor from previous page
ORDER BY created_at
LIMIT 100;

-- Batch inserts reduce per-operation overhead
-- Single multi-row INSERT is more efficient than multiple statements
INSERT INTO events (event_type, payload, created_at)
VALUES
    ('click', '{"button": "buy"}', now()),
    ('click', '{"button": "cart"}', now()),
    ('view', '{"page": "home"}', now());
```

## Backup and Disaster Recovery

CockroachDB Serverless includes automatic backups, but understanding recovery options is essential.

### Point-in-Time Recovery

Restore data to a specific moment using CockroachDB's time-travel queries.

```sql
-- Query data as it existed at a specific timestamp
-- Useful for auditing or recovering from accidental changes
SELECT * FROM orders
AS OF SYSTEM TIME '2024-01-15 10:30:00'
WHERE id = 'abc123';

-- Compare current state with historical state
-- Helps identify what changed and when
SELECT
    current.id,
    current.status as current_status,
    historical.status as previous_status,
    current.updated_at
FROM orders current
JOIN orders AS OF SYSTEM TIME '-1 hour' historical
    ON current.id = historical.id
WHERE current.status != historical.status;

-- Restore accidentally deleted rows
-- Time-travel allows recovery within the retention window
INSERT INTO orders
SELECT * FROM orders
AS OF SYSTEM TIME '-30 minutes'
WHERE id IN ('deleted-id-1', 'deleted-id-2');
```

## Security Best Practices

Secure your CockroachDB Serverless deployment with proper access controls.

```sql
-- Create application-specific roles with minimal privileges
-- Principle of least privilege reduces blast radius of compromised credentials
CREATE ROLE app_reader;
GRANT SELECT ON TABLE users, orders, products TO app_reader;

CREATE ROLE app_writer;
GRANT SELECT, INSERT, UPDATE ON TABLE users, orders TO app_writer;
GRANT SELECT ON TABLE products TO app_writer;

-- Create users and assign roles
-- Use separate credentials for different application components
CREATE USER api_service WITH PASSWORD 'secure-password-here';
GRANT app_writer TO api_service;

CREATE USER analytics_service WITH PASSWORD 'another-secure-password';
GRANT app_reader TO analytics_service;

-- Row-level security for multi-tenant applications
-- Ensures tenants can only access their own data
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Set tenant context before queries
SET app.current_tenant = 'tenant-uuid-here';
SELECT * FROM orders;  -- Only returns orders for the current tenant
```

## Migration from PostgreSQL

Moving from PostgreSQL to CockroachDB Serverless requires minimal changes due to wire compatibility.

### Schema Migration Considerations

```sql
-- PostgreSQL serial columns work but create write hotspots
-- Convert to UUID for better distribution
ALTER TABLE users
    ALTER COLUMN id SET DATA TYPE UUID
    USING gen_random_uuid(),
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- PostgreSQL arrays are fully supported
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id),
    names STRING[]
);

-- Full-text search syntax differs slightly
-- CockroachDB uses full_text_search instead of to_tsvector
CREATE INDEX idx_posts_search ON posts
    USING GIN (to_tsvector('english', title || ' ' || body));

-- Stored procedures use slightly different syntax
-- Most PostgreSQL functions work without modification
CREATE FUNCTION calculate_order_total(order_id UUID)
RETURNS DECIMAL AS $$
    SELECT SUM(quantity * unit_price)
    FROM order_items
    WHERE order_id = calculate_order_total.order_id;
$$ LANGUAGE SQL;
```

## Conclusion

CockroachDB Serverless provides a powerful foundation for applications that need distributed SQL capabilities without operational complexity. Key takeaways:

- Use UUID primary keys to avoid write hotspots
- Implement retry logic with exponential backoff for serialization conflicts
- Configure connection pools appropriately for serverless environments
- Create covering indexes to minimize RU consumption
- Leverage time-travel queries for auditing and recovery

Start with the free tier to experiment, then scale seamlessly as your workload grows. The combination of PostgreSQL compatibility and distributed architecture makes CockroachDB Serverless an excellent choice for modern, globally-distributed applications.
