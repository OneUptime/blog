# How to Tune PostgreSQL for OLTP Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, OLTP, Performance, Tuning, High Concurrency, Transactions

Description: A comprehensive guide to tuning PostgreSQL for OLTP (Online Transaction Processing) workloads, covering memory settings, connection management, checkpoint optimization, and high-concurrency configurations.

---

OLTP workloads are characterized by high concurrency, short transactions, and a mix of reads and writes. PostgreSQL can handle demanding OLTP workloads when properly tuned. This guide covers essential optimizations for transaction-heavy applications.

## Prerequisites

- PostgreSQL 14+ installed
- Access to postgresql.conf
- Understanding of your workload patterns
- Baseline performance metrics

## OLTP Workload Characteristics

| Characteristic | OLTP Pattern |
|---------------|--------------|
| Transactions | Short, frequent |
| Queries | Simple, indexed lookups |
| Data Access | Row-level, random I/O |
| Concurrency | High (100s-1000s connections) |
| Latency | Critical (milliseconds) |
| Data Volume | Moderate per transaction |

## Memory Configuration

### shared_buffers

Buffer cache for frequently accessed data:

```conf
# postgresql.conf

# OLTP: 25% of RAM, but cap at 8-16GB
# For 32GB RAM server:
shared_buffers = 8GB

# For 64GB RAM server:
shared_buffers = 16GB
```

### effective_cache_size

Tell optimizer about available memory:

```conf
# Total memory available for caching (OS + PostgreSQL)
# Typically 75% of total RAM
effective_cache_size = 24GB  # For 32GB server
```

### work_mem

Memory for sort and hash operations per operation:

```conf
# OLTP: Keep low since many concurrent operations
# Formula: (Available RAM - shared_buffers) / (max_connections * 2)
work_mem = 16MB

# Monitor with:
# EXPLAIN (ANALYZE, BUFFERS) your_query;
# Look for "Sort Method: external merge Disk"
```

### maintenance_work_mem

Memory for maintenance operations:

```conf
# Can be higher since maintenance runs less frequently
maintenance_work_mem = 1GB

# For autovacuum workers specifically
autovacuum_work_mem = 512MB
```

## Connection Management

### max_connections

```conf
# Direct connections (without pooler)
# Each connection uses ~10MB RAM
max_connections = 200

# With connection pooler (PgBouncer)
# Can be lower since pooler handles connection management
max_connections = 100
```

### Connection Pooling

Connection pooling is essential for OLTP:

```ini
# pgbouncer.ini
[databases]
myapp = host=localhost port=5432 dbname=myapp

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings for OLTP
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

# Short server lifetime for connection refresh
server_lifetime = 3600
server_idle_timeout = 600
```

## Checkpoint Tuning

Checkpoints can cause I/O spikes affecting latency:

```conf
# Spread checkpoint I/O over longer period
checkpoint_completion_target = 0.9

# Increase checkpoint interval
checkpoint_timeout = 15min

# Increase max WAL size to reduce checkpoint frequency
max_wal_size = 4GB
min_wal_size = 1GB
```

### Monitor Checkpoints

```sql
-- Check checkpoint frequency
SELECT * FROM pg_stat_bgwriter;

-- If checkpoints_timed >> checkpoints_req, good
-- If checkpoints_req is high, increase max_wal_size
```

## WAL Configuration

### Synchronous Commit

```conf
# For maximum durability (default)
synchronous_commit = on

# For better performance (risk: lose last few transactions on crash)
# Only if your application can tolerate this
synchronous_commit = off
```

### WAL Buffers

```conf
# Increase for write-heavy OLTP
wal_buffers = 64MB

# WAL compression (saves I/O)
wal_compression = on
```

### WAL Level

```conf
# Minimal if no replication needed
wal_level = minimal

# Replica for streaming replication
wal_level = replica
```

## Background Writer

Tune background writer to smooth out I/O:

```conf
# How often bgwriter runs
bgwriter_delay = 200ms

# Max pages written per round
bgwriter_lru_maxpages = 100

# Multiplier for pages to write
bgwriter_lru_multiplier = 2.0

# Flush dirty pages more aggressively
bgwriter_flush_after = 512kB
```

## Autovacuum Tuning

OLTP generates many dead tuples requiring frequent vacuum:

```conf
# More aggressive autovacuum for OLTP
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s

# Lower thresholds to vacuum sooner
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50

# Lower scale factors for large tables
autovacuum_vacuum_scale_factor = 0.05  # 5% of table
autovacuum_analyze_scale_factor = 0.025  # 2.5% of table

# Cost-based vacuum delay
autovacuum_vacuum_cost_delay = 2ms
autovacuum_vacuum_cost_limit = 1000
```

### Per-Table Autovacuum

For hot tables:

```sql
-- Very active tables need more aggressive vacuum
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_vacuum_threshold = 100
);

-- Check autovacuum activity
SELECT schemaname, relname, n_dead_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

## Index Optimization

### B-tree Indexes for OLTP

```sql
-- Primary key (automatically indexed)
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Foreign key indexes (critical for OLTP)
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Composite index for common queries
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- Covering index to avoid table lookup
CREATE INDEX idx_orders_customer_covering
ON orders(customer_id)
INCLUDE (status, total);
```

### Partial Indexes

```sql
-- Index only active records
CREATE INDEX idx_orders_active
ON orders(customer_id, created_at)
WHERE status = 'active';

-- Index only recent data
CREATE INDEX idx_orders_recent
ON orders(customer_id)
WHERE created_at > '2025-01-01';
```

### Index Maintenance

```conf
# Allow more parallel index operations
max_parallel_maintenance_workers = 4
```

```sql
-- Create indexes without blocking
CREATE INDEX CONCURRENTLY idx_new ON orders(column);

-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_orders_customer_id;
```

## Query Optimization

### Prepared Statements

```sql
-- Use prepared statements to reduce planning overhead
PREPARE get_order(bigint) AS
    SELECT * FROM orders WHERE id = $1;

EXECUTE get_order(12345);

-- Check prepared statement cache
SHOW plan_cache_mode;  -- auto, force_generic_plan, force_custom_plan
```

### Planner Settings

```conf
# Enable JIT for complex queries (disable for simple OLTP)
jit = off

# Planner cost settings (adjust based on your storage)
random_page_cost = 1.1  # SSD
seq_page_cost = 1.0

# Effective I/O concurrency for SSD
effective_io_concurrency = 200

# Parallel query settings (usually not needed for simple OLTP)
max_parallel_workers_per_gather = 0  # Disable for simple queries
```

## Lock Optimization

### Reduce Lock Contention

```sql
-- Use SKIP LOCKED for queue-like patterns
SELECT * FROM tasks
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- Use advisory locks for application-level locking
SELECT pg_advisory_lock(hashtext('process_order_' || order_id::text));
-- Do work
SELECT pg_advisory_unlock(hashtext('process_order_' || order_id::text));
```

### Monitor Locks

```sql
-- Check for lock contention
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
```

## Complete OLTP Configuration

```conf
# postgresql.conf - OLTP optimized for 32GB RAM server

# Memory
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 16MB
maintenance_work_mem = 1GB
huge_pages = try

# Connections
max_connections = 200
superuser_reserved_connections = 3

# WAL
wal_level = replica
wal_buffers = 64MB
synchronous_commit = on
wal_compression = on

# Checkpoints
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
max_wal_size = 4GB
min_wal_size = 1GB

# Background Writer
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0

# Autovacuum
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.025
autovacuum_vacuum_cost_delay = 2ms
autovacuum_vacuum_cost_limit = 1000

# Planner
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 100

# JIT (disable for simple OLTP)
jit = off

# Parallel Query (minimal for OLTP)
max_parallel_workers_per_gather = 0
max_parallel_workers = 4
max_parallel_maintenance_workers = 4

# Logging
log_min_duration_statement = 100ms
log_checkpoints = on
log_lock_waits = on
deadlock_timeout = 1s
```

## Monitoring OLTP Performance

### Key Metrics

```sql
-- Transactions per second
SELECT
    datname,
    xact_commit + xact_rollback AS total_xacts,
    xact_commit,
    xact_rollback,
    blks_hit,
    blks_read,
    ROUND(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2) AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = 'myapp';

-- Active connections and states
SELECT
    state,
    COUNT(*) AS count,
    ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - state_change))), 2) AS avg_duration_sec
FROM pg_stat_activity
WHERE datname = 'myapp'
GROUP BY state;

-- Tuple operations (INSERT/UPDATE/DELETE rates)
SELECT
    relname,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples
FROM pg_stat_user_tables
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
LIMIT 10;
```

### pg_stat_statements Analysis

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top queries by total time
SELECT
    substring(query, 1, 100) AS query_snippet,
    calls,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    ROUND(mean_exec_time::numeric, 2) AS mean_ms,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Queries with high latency variability
SELECT
    substring(query, 1, 100) AS query_snippet,
    calls,
    ROUND(mean_exec_time::numeric, 2) AS mean_ms,
    ROUND(stddev_exec_time::numeric, 2) AS stddev_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY stddev_exec_time DESC
LIMIT 10;
```

## Best Practices

1. **Use connection pooling** - Essential for OLTP concurrency
2. **Keep transactions short** - Avoid long-running transactions
3. **Index foreign keys** - Critical for join performance
4. **Monitor dead tuples** - Tune autovacuum accordingly
5. **Use prepared statements** - Reduce planning overhead
6. **Disable JIT for simple queries** - JIT adds latency for simple operations
7. **Set statement timeout** - Prevent runaway queries

```sql
-- Set statement timeout
SET statement_timeout = '30s';

-- Set lock timeout
SET lock_timeout = '10s';
```

## Conclusion

PostgreSQL OLTP tuning focuses on:

1. **Memory balance** - Adequate shared_buffers without starving connections
2. **Connection management** - Use pooling for high concurrency
3. **Checkpoint spreading** - Avoid I/O spikes
4. **Aggressive autovacuum** - Keep tables healthy
5. **Proper indexing** - Support common access patterns
6. **Lock management** - Minimize contention

Regular monitoring and iterative tuning based on actual workload patterns will yield the best results.
