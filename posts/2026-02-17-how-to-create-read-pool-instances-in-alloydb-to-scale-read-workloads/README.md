# How to Create Read Pool Instances in AlloyDB to Scale Read Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, PostgreSQL, Read Replicas, Scaling

Description: Learn how to create and configure read pool instances in AlloyDB for PostgreSQL to horizontally scale read-heavy workloads and improve application performance.

---

Most applications read far more than they write. Your API might serve 100 read requests for every write. Your reporting dashboard scans millions of rows but never modifies them. In these scenarios, the primary AlloyDB instance does double duty - handling writes and serving reads - which limits how much you can scale.

Read pool instances solve this by creating dedicated compute nodes that serve read queries. They share the same storage layer as the primary, so there is no replication lag in the traditional sense. Reads hit a consistent view of the data. In this post, I will show you how to create read pool instances, route traffic to them, and size them for your workload.

## How Read Pool Instances Work

AlloyDB's architecture separates compute from storage. The primary instance and read pool instances all connect to the same distributed storage layer. When data is written through the primary, it is immediately visible to read pool instances because they are reading from the same storage.

This is different from traditional PostgreSQL replicas, which use streaming replication with some lag. AlloyDB read pool instances provide near-zero replication lag because they are not replicas in the traditional sense - they are additional compute nodes reading from shared storage.

A read pool is a group of one or more read-only instances that share a single connection endpoint. AlloyDB automatically load-balances connections across the instances in the pool.

## Prerequisites

- An existing AlloyDB cluster with a primary instance
- The gcloud CLI installed and authenticated
- A workload that benefits from read scaling

## Step 1 - Create a Read Pool Instance

Creating a read pool instance is straightforward:

```bash
# Create a read pool with 2 nodes, each with 4 CPUs
gcloud alloydb instances create my-read-pool \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --instance-type=READ_POOL \
  --cpu-count=4 \
  --read-pool-node-count=2
```

The `--read-pool-node-count` flag determines how many nodes are in the pool. Each node gets the specified CPU count and corresponding memory. More nodes means more concurrent read capacity.

Monitor the creation:

```bash
# Check read pool instance status
gcloud alloydb instances describe my-read-pool \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --format="yaml(state,instanceType,readPoolConfig,ipAddress)"
```

## Step 2 - Get the Read Pool Connection Endpoint

The read pool has its own IP address, separate from the primary:

```bash
# Get the read pool IP address
gcloud alloydb instances describe my-read-pool \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --format="value(ipAddress)"
```

You connect to this IP for read-only queries. AlloyDB load-balances connections across all nodes in the pool.

## Step 3 - Configure Your Application for Read/Write Splitting

The typical pattern is to send writes to the primary instance and reads to the read pool. Here is how to set this up in common frameworks.

Python with psycopg2:

```python
# Read/write splitting with separate connection pools
import psycopg2
from psycopg2 import pool

# Connection pool for write operations (primary instance)
write_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    host='PRIMARY_IP',
    port=5432,
    dbname='myapp',
    user='appuser',
    password='password'
)

# Connection pool for read operations (read pool instance)
read_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host='READ_POOL_IP',
    port=5432,
    dbname='myapp',
    user='appuser',
    password='password'
)

def get_user(user_id):
    """Read query - uses the read pool."""
    conn = read_pool.getconn()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cursor.fetchone()
    finally:
        read_pool.putconn(conn)

def update_user(user_id, name):
    """Write query - uses the primary instance."""
    conn = write_pool.getconn()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET name = %s WHERE id = %s", (name, user_id))
        conn.commit()
    finally:
        write_pool.putconn(conn)
```

Node.js with pg:

```javascript
// Read/write splitting with separate connection pools
const { Pool } = require('pg');

// Primary pool for writes
const writePool = new Pool({
  host: 'PRIMARY_IP',
  port: 5432,
  database: 'myapp',
  user: 'appuser',
  password: 'password',
  max: 10,
});

// Read pool for reads
const readPool = new Pool({
  host: 'READ_POOL_IP',
  port: 5432,
  database: 'myapp',
  user: 'appuser',
  password: 'password',
  max: 20,  // More connections for reads
});

// Helper functions that route to the right pool
async function query(sql, params) {
  return writePool.query(sql, params);
}

async function readQuery(sql, params) {
  return readPool.query(sql, params);
}
```

## Step 4 - Scale the Read Pool

If your read traffic grows, you can add more nodes to the pool:

```bash
# Scale up the read pool from 2 to 4 nodes
gcloud alloydb instances update my-read-pool \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --read-pool-node-count=4
```

New nodes are added without downtime. Existing connections continue working while new nodes come online and start accepting connections.

You can also scale down:

```bash
# Scale down the read pool to 1 node during off-peak hours
gcloud alloydb instances update my-read-pool \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --read-pool-node-count=1
```

## Step 5 - Create Multiple Read Pools for Different Workloads

You can create multiple read pools with different configurations for different workloads:

```bash
# Create a read pool optimized for OLTP reads (small, fast queries)
gcloud alloydb instances create oltp-read-pool \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --instance-type=READ_POOL \
  --cpu-count=4 \
  --read-pool-node-count=4

# Create a read pool optimized for analytics (large, slow queries)
gcloud alloydb instances create analytics-read-pool \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --instance-type=READ_POOL \
  --cpu-count=16 \
  --read-pool-node-count=2
```

This prevents heavy analytical queries from competing with latency-sensitive application reads. The OLTP pool gets more smaller nodes (for connection concurrency), while the analytics pool gets fewer larger nodes (for query processing power).

## Monitoring Read Pool Performance

Track the performance of your read pool instances:

```sql
-- Connect to the read pool and check active queries
SELECT
  pid,
  usename,
  datname,
  state,
  query,
  now() - query_start AS duration
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

From Cloud Monitoring:

```bash
# Check read pool CPU utilization
gcloud monitoring time-series list \
  --filter='resource.type="alloydb.googleapis.com/Instance" AND metric.type="alloydb.googleapis.com/database/cpu/utilization"' \
  --interval-start-time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

## Sizing Recommendations

**For web application reads** (small queries, many connections): Use more nodes with smaller CPU counts. 4-8 nodes with 2-4 CPUs each handles many concurrent connections well.

**For reporting and dashboards** (large queries, fewer connections): Use fewer nodes with higher CPU counts. 2-4 nodes with 8-16 CPUs each gives you processing power for complex queries.

**For mixed workloads**: Create separate read pools as described above. Route different types of queries to the appropriate pool.

## Connection Pooling with Read Pools

Consider using a connection pooler like PgBouncer in front of your read pool for even better connection management:

```bash
# PgBouncer configuration for the read pool
# pgbouncer.ini
[databases]
myapp_read = host=READ_POOL_IP port=5432 dbname=myapp

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = md5
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 50
```

This lets you support thousands of application connections while keeping a manageable number of actual database connections.

## What Read Pool Instances Cannot Do

Read pool instances are read-only. If your application accidentally sends a write query to the read pool, it will get an error. Make sure your read/write splitting is correctly implemented in your application layer.

Read pool instances also cannot run DDL commands (CREATE TABLE, ALTER TABLE, etc.) or write to temporary tables. Any operation that modifies the database must go through the primary instance.

AlloyDB read pool instances are one of the cleanest ways to scale read-heavy PostgreSQL workloads. The shared storage architecture means no replication lag, and the ability to create multiple pools with different configurations gives you fine-grained control over how different workloads are served. Start with a single read pool and add more as your traffic patterns become clear.
