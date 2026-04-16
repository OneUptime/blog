# How to Debug Distributed Query Failures in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, Debugging, Performance

Description: A systematic approach to debugging distributed query failures in ClickHouse using system tables, logs, and query tracing tools.

---

## Overview

Distributed queries in ClickHouse fan out to multiple shards and replicas. When something goes wrong, the error messages can be cryptic and may originate from a remote shard. This guide walks through a systematic debugging process.

## Step 1 - Capture the Full Error

Always check the full error with the remote exception details:

```sql
-- Run the failing query and capture the output
-- Check system.query_log for the full exception
SELECT
    query,
    exception,
    stack_trace,
    type
FROM system.query_log
WHERE type IN ('ExceptionWhileProcessing', 'ExceptionBeforeStart')
  AND event_time >= now() - INTERVAL 10 MINUTE
ORDER BY event_time DESC
LIMIT 10;
```

## Step 2 - Check Cluster Health

```sql
-- Check all shards are reachable and healthy
SELECT
    cluster,
    shard_num,
    replica_num,
    host_name,
    host_address,
    port,
    errors_count,
    estimated_recovery_time
FROM system.clusters
WHERE cluster = 'your_cluster'
ORDER BY shard_num, replica_num;
```

A non-zero `errors_count` or a future `estimated_recovery_time` indicates a problematic shard.

## Step 3 - Identify Which Shard Failed

```sql
-- Use clusterAllReplicas to test each shard individually
SELECT
    hostName() AS host,
    count() AS row_count
FROM clusterAllReplicas('your_cluster', 'your_database', 'your_table')
GROUP BY host;
```

If a shard is failing, it will throw an error or not appear in results.

## Step 4 - Test the Query on Each Shard Directly

SSH into each shard and run the query locally:

```bash
# On shard 1
clickhouse-client -h clickhouse-shard1 --query "
SELECT count() FROM your_database.your_table
"

# On shard 2
clickhouse-client -h clickhouse-shard2 --query "
SELECT count() FROM your_database.your_table
"
```

## Step 5 - Enable Query Tracing

For complex distributed failures, enable OpenTelemetry tracing:

```sql
-- Enable distributed tracing
SET opentelemetry_start_trace_probability = 1.0;
SET opentelemetry_trace_processors = 1;

-- Run the query - trace_id will be logged
SELECT count() FROM distributed_table;

-- Find the trace in query_log
SELECT
    query_id,
    trace_id,
    query,
    read_rows,
    read_bytes,
    exception
FROM system.query_log
WHERE type != 'QueryStart'
  AND event_time >= now() - INTERVAL 5 MINUTE
ORDER BY event_time DESC
LIMIT 20;
```

## Step 6 - Check Distributed Table Settings

```sql
-- Examine the distributed table definition
SHOW CREATE TABLE distributed_events;

-- Check for issues with the cluster name or sharding key
SELECT
    name,
    engine,
    engine_full
FROM system.tables
WHERE engine = 'Distributed'
  AND database = 'your_database';
```

## Step 7 - Check Remote Query Logs

```sql
-- Query logs from all shards using remote()
SELECT
    hostName() AS shard,
    query_id,
    exception,
    event_time
FROM clusterAllReplicas('your_cluster', system, query_log)
WHERE type = 'ExceptionWhileProcessing'
  AND event_time >= now() - INTERVAL 30 MINUTE
ORDER BY event_time DESC
LIMIT 20;
```

## Step 8 - Debug Memory Errors on Remote Shards

Memory errors on shards often manifest as distributed query failures:

```sql
-- Check memory usage across shards
SELECT
    hostName() AS shard,
    formatReadableSize(memory_usage) AS current_memory,
    formatReadableSize(peak_memory_usage) AS peak_memory
FROM clusterAllReplicas('your_cluster', system, processes);
```

```bash
# Check shard logs for OOM errors
grep -i "memory" /var/log/clickhouse-server/clickhouse-server.err.log | tail -20
grep -i "exception" /var/log/clickhouse-server/clickhouse-server.log | tail -50
```

## Step 9 - Check Distributed Table Buffer and Failures

ClickHouse queues distributed inserts - check for failures:

```bash
# Check the distributed queue directory
ls -la /var/lib/clickhouse/data/your_database/distributed_table/
ls -la /var/lib/clickhouse/data/your_database/distributed_table/broken/
```

If there are files in `broken/`, those inserts failed. You can replay them:

```bash
# Move broken files back to the queue
mv /var/lib/clickhouse/data/your_database/distributed_table/broken/* \
   /var/lib/clickhouse/data/your_database/distributed_table/
```

## Step 10 - Reproduce with a Simplified Query

```sql
-- Start simple and add complexity back
-- Step 1: basic count
SELECT count() FROM distributed_table;

-- Step 2: add WHERE clause
SELECT count() FROM distributed_table WHERE date >= '2024-01-01';

-- Step 3: add the failing GROUP BY or JOIN
SELECT user_id, count()
FROM distributed_table
WHERE date >= '2024-01-01'
GROUP BY user_id
LIMIT 10;
```

## Common Distributed Query Errors and Fixes

```text
Error: "Table ... doesn't exist on shard"
Fix: Ensure the underlying local table exists on all shards with the same name.

Error: "Memory limit exceeded on remote shard"
Fix: Reduce query complexity, add LIMIT, or increase max_memory_usage.

Error: "Connection refused"
Fix: Check that ClickHouse is running on the shard and ports are open.

Error: "Timeout exceeded while reading from socket"
Fix: Increase distributed_connections_pool_size or receive_timeout settings.
```

## Summary

Debugging distributed ClickHouse query failures requires checking system.query_log for full exceptions, verifying cluster health in system.clusters, and isolating which shard is failing with `clusterAllReplicas`. Enable OpenTelemetry tracing for complex issues and always test the query directly on each shard via SSH. Check the distributed queue's `broken/` directory for failed async inserts.
