# How to Debug ClickHouse Distributed Query Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, Query, Debug, Troubleshooting

Description: Debug ClickHouse distributed query failures by tracing query execution across shards, reading shard error messages, and using EXPLAIN PIPELINE.

---

Distributed query failures in ClickHouse can be tricky because errors originate on remote shards but surface on the coordinator. The error message may be truncated or reference a shard you cannot directly access.

## Get Verbose Logs From Remote Shards

Errors from remote shards propagate to the coordinator by default, but the streamed server log messages that accompany them are filtered. Turn up the log level for the session to see debug output from each shard while the query runs:

```sql
SET send_logs_level = 'debug';
```

Accepted values are `none`, `fatal`, `error`, `warning`, `information`, `debug`, and `trace`. Combine with `log_queries = 1` (see below) to persist the detail in `system.query_log`.

## Check Which Shards Are Failing

```sql
SELECT
    cluster,
    shard_num,
    host_name,
    errors_count,
    estimated_recovery_time
FROM system.clusters
WHERE cluster = 'my_cluster'
ORDER BY errors_count DESC;
```

High `errors_count` identifies problematic shards.

## Run the Query Directly on Each Shard

Use `clusterAllReplicas` or direct shard connections to isolate the failing shard:

```sql
-- Run on all replicas and see which fail
SELECT hostName(), count()
FROM clusterAllReplicas('my_cluster', 'my_database', 'my_local_table')
GROUP BY hostName();
```

## Trace Query Execution with EXPLAIN

```sql
EXPLAIN PIPELINE
SELECT count() FROM distributed_table
WHERE event_date = today();
```

This shows the local execution pipeline on the coordinator, including the `Remote` processors that read from each shard. To inspect the plan itself, use `EXPLAIN PLAN` instead.

## Check Distributed Query Log

```sql
SELECT
    event_time,
    query_id,
    hostname,
    type,
    exception,
    query
FROM system.query_log
WHERE has(tables, 'my_database.distributed_table')
  AND type IN ('ExceptionBeforeStart', 'ExceptionWhileProcessing')
  AND event_time > now() - INTERVAL 1 HOUR
ORDER BY event_time DESC
LIMIT 20;
```

## Enable Distributed Query Tracing

```sql
SET log_queries = 1;
SET log_query_threads = 1;
SET send_logs_level = 'debug';

SELECT count() FROM distributed_table;
```

This logs detailed execution info to `system.query_log` and `system.query_thread_log`.

## Handle Partial Shard Failures

For reads, allow queries to succeed even if some shards are unavailable:

```sql
SET skip_unavailable_shards = 1;
SELECT count() FROM distributed_table;
```

This returns partial results but avoids total query failure.

## Check for Schema Drift

The most common silent distributed query failure is schema mismatch between shards:

```sql
SELECT hostName(), name, type
FROM clusterAllReplicas('my_cluster', system.columns)
WHERE table = 'my_local_table'
ORDER BY hostName(), name;
```

Any shard with different column types will fail.

## Summary

Debug distributed ClickHouse query failures by checking `system.clusters` for error counts, running queries directly on each shard with `clusterAllReplicas`, enabling `skip_unavailable_shards` for partial results, and checking schema consistency across all nodes. Use `EXPLAIN PIPELINE` to understand query decomposition and `log_queries = 1` to capture detailed execution traces.
