# How to Tune PostgreSQL Performance for Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PostgreSQL, Performance, State Store, Database Tuning

Description: Learn key PostgreSQL tuning strategies for Dapr state management, including connection pooling, indexing, and configuration parameters to maximize throughput.

---

## Overview

PostgreSQL is a robust relational database that Dapr supports as a state store. While it offers strong ACID guarantees and rich querying capabilities, its default configuration prioritizes safety over performance. This guide covers practical tuning techniques to maximize PostgreSQL throughput and minimize latency for Dapr state operations.

## PostgreSQL Configuration Tuning

Start with PostgreSQL server parameters in `postgresql.conf`:

```bash
# Memory settings
shared_buffers = 2GB              # 25% of total RAM
effective_cache_size = 6GB        # 75% of total RAM
work_mem = 64MB                   # Per-sort/hash operation
maintenance_work_mem = 512MB      # For VACUUM, CREATE INDEX

# Connection settings
max_connections = 200
superuser_reserved_connections = 5

# Write-ahead log (WAL) tuning
wal_buffers = 64MB
min_wal_size = 1GB
max_wal_size = 4GB
checkpoint_completion_target = 0.9
synchronous_commit = off           # Improve write performance (small data loss risk)

# Query planner
random_page_cost = 1.1            # For SSDs
effective_io_concurrency = 200    # For SSDs
```

## Using PgBouncer for Connection Pooling

Dapr creates one connection per sidecar instance. Use PgBouncer to pool these connections:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgbouncer-config
data:
  pgbouncer.ini: |
    [databases]
    daprdb = host=postgres port=5432 dbname=daprdb

    [pgbouncer]
    listen_port = 6432
    listen_addr = 0.0.0.0
    auth_type = scram-sha-256
    pool_mode = transaction
    max_client_conn = 500
    default_pool_size = 25
    min_pool_size = 5
    reserve_pool_size = 5
    server_idle_timeout = 600
```

Update the Dapr component to connect through PgBouncer:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: postgres-statestore
  namespace: default
spec:
  type: state.postgresql
  version: v2
  metadata:
  - name: connectionString
    value: "host=pgbouncer port=6432 dbname=daprdb user=dapr password=secret sslmode=require pool_max_conns=10"
  - name: tablePrefix
    value: "dapr_"
  - name: cleanupInterval
    value: "1h"
```

## Indexing the Dapr State Table

The Dapr state table schema benefits from additional indexes for common query patterns:

```sql
-- Default index on primary key (key column) is created automatically
-- Add index for metadata queries if using Dapr's actor state
CREATE INDEX CONCURRENTLY idx_dapr_state_key_btree
  ON dapr_state (key text_pattern_ops);

-- Partial index for frequently accessed hot keys
CREATE INDEX CONCURRENTLY idx_dapr_state_hot
  ON dapr_state (key)
  WHERE updated_at > NOW() - INTERVAL '1 hour';
```

## Monitoring Query Performance

Use `pg_stat_statements` to identify slow Dapr queries:

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries
SELECT query, calls, total_exec_time / calls AS avg_ms, rows
FROM pg_stat_statements
WHERE query LIKE '%dapr_state%'
ORDER BY avg_ms DESC
LIMIT 10;
```

Check active connections from Dapr sidecars:

```sql
SELECT application_name, count(*), state
FROM pg_stat_activity
WHERE datname = 'daprdb'
GROUP BY application_name, state;
```

## Vacuum and Maintenance

Regular VACUUM prevents table bloat from Dapr's frequent updates:

```sql
-- Configure autovacuum for the state table
ALTER TABLE dapr_state SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_delay = 2
);
```

## Summary

Tuning PostgreSQL for Dapr involves adjusting memory configuration, deploying PgBouncer to manage connection overhead, and fine-tuning autovacuum to handle the high update frequency typical of Dapr state operations. Combined with proper indexing and monitoring via `pg_stat_statements`, these steps can significantly improve Dapr state operation latency and throughput.
