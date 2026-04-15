# How to Monitor Replication Lag in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Monitoring, Observability, Database

Description: Learn how to monitor ClickHouse replication lag using system tables, set up alerting thresholds, and diagnose the root cause when replicas fall behind.

Replication lag in ClickHouse means a replica is behind the leader and has not yet applied all the data parts or merges that the leader has. A small amount of lag is normal, but growing lag indicates a problem that will eventually cause the replica to fall so far behind it cannot catch up on its own. This guide covers every tool ClickHouse gives you to measure and diagnose lag.

## The Primary Lag Metric: `absolute_delay`

The most important field in `system.replicas` is `absolute_delay`. It represents how many seconds the current replica is behind the most advanced replica in the same shard:

```sql
SELECT
    database,
    table,
    replica_name,
    is_leader,
    absolute_delay,
    queue_size,
    inserts_in_queue,
    merges_in_queue
FROM system.replicas
ORDER BY absolute_delay DESC;
```

Typical thresholds for alerting:

```text
absolute_delay = 0     -- fully caught up
absolute_delay < 10    -- normal, acceptable lag
absolute_delay 10-60   -- worth watching, may indicate load spike
absolute_delay > 60    -- alert: replica is falling behind
absolute_delay > 300   -- critical: investigate immediately
```

## Watching the Replication Queue

The replication queue shows work that the current replica still needs to do. A large queue is not always a problem (a replica catching up after downtime will have a large queue that shrinks quickly), but a queue that is not shrinking is a problem:

```sql
SELECT
    database,
    table,
    type,
    create_time,
    required_quorum,
    source_replica,
    new_part_name,
    parts_to_merge,
    is_currently_executing,
    num_tries,
    last_exception,
    last_attempt_time,
    num_postponed,
    postpone_reason
FROM system.replication_queue
ORDER BY create_time ASC
LIMIT 50;
```

Pay attention to:

- `num_tries`: a high value means the task keeps failing and retrying
- `last_exception`: the error message from the last failure
- `is_currently_executing`: whether the task is actively being processed right now
- `type`: `GET_PART` means downloading a part from another replica; `MERGE_PARTS` means merging local parts

## Diagnosing a Stalled Queue

If the queue is not shrinking, check these common causes:

```sql
-- Check for tasks that have failed many times
SELECT
    database,
    table,
    type,
    new_part_name,
    num_tries,
    last_exception,
    last_attempt_time
FROM system.replication_queue
WHERE num_tries > 5
ORDER BY num_tries DESC;

-- Check if ZooKeeper is reachable
SELECT * FROM system.zookeeper WHERE path = '/clickhouse';

-- Check the error log for replication errors
SELECT
    event_time,
    level,
    message
FROM system.text_log
WHERE message LIKE '%Replication%'
  AND level IN ('Error', 'Warning')
  AND event_time > now() - INTERVAL 1 HOUR
ORDER BY event_time DESC
LIMIT 100;
```

## Measuring Queue Depth Over Time

Query `system.replication_queue` at regular intervals and store the count to build a trend:

```sql
-- Current queue depth per table
SELECT
    database,
    table,
    countIf(type = 'GET_PART')    AS parts_to_fetch,
    countIf(type = 'MERGE_PARTS') AS merges_pending,
    countIf(type = 'MUTATE_PART') AS mutations_pending,
    count()                        AS total
FROM system.replication_queue
GROUP BY database, table
ORDER BY total DESC;
```

## Using system.asynchronous_metric_log for Historical Trends

If you have `asynchronous_metric_log` enabled, you can query historical replication metrics. Check if the table exists:

```sql
-- Check if asynchronous_metric_log is enabled
SELECT count() FROM system.tables WHERE database = 'system' AND name = 'asynchronous_metric_log';

-- Enable asynchronous_metric_log in config.d/asynchronous_metric_log.xml
```

```xml
<clickhouse>
    <asynchronous_metric_log>
        <database>system</database>
        <table>asynchronous_metric_log</table>
        <flush_interval_milliseconds>7000</flush_interval_milliseconds>
    </asynchronous_metric_log>
</clickhouse>
```

```sql
-- Query historical replication delay and queue depth
SELECT
    toStartOfMinute(event_time) AS minute,
    avgIf(value, metric = 'ReplicasMaxAbsoluteDelay') AS avg_max_delay,
    avgIf(value, metric = 'ReplicasSumQueueSize')     AS avg_queue_size
FROM system.asynchronous_metric_log
WHERE event_time > now() - INTERVAL 1 DAY
  AND metric IN ('ReplicasMaxAbsoluteDelay', 'ReplicasSumQueueSize')
GROUP BY minute
ORDER BY minute;
```

## Monitoring with Prometheus

ClickHouse exposes a Prometheus metrics endpoint. Scrape it and alert on these metrics:

```text
# Replication queue size (number of pending tasks)
ClickHouseAsyncMetrics_ReplicasMaxQueueSize

# Maximum absolute delay across all replicated tables on this node
ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay

# Number of replicas in read-only mode (ZooKeeper disconnected)
ClickHouseMetrics_ReadonlyReplica
```

Configure the endpoint in `config.d/prometheus.xml`:

```xml
<clickhouse>
    <prometheus>
        <endpoint>/metrics</endpoint>
        <port>9363</port>
        <metrics>true</metrics>
        <events>true</events>
        <asynchronous_metrics>true</asynchronous_metrics>
    </prometheus>
</clickhouse>
```

A Prometheus alerting rule for replication lag:

```yaml
groups:
  - name: clickhouse_replication
    rules:
      - alert: ClickHouseReplicationLag
        expr: ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay > 60
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse replication lag on {{ $labels.instance }}"
          description: "Max absolute delay is {{ $value }}s"

      - alert: ClickHouseReplicaReadOnly
        expr: ClickHouseMetrics_ReadonlyReplica > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ClickHouse replica in read-only mode on {{ $labels.instance }}"
```

## Checking Replication Speed

When a replica is catching up, you can estimate how long it will take by comparing the queue size to the rate of processing:

```sql
-- See how fast the queue is draining (run twice 60 seconds apart)
SELECT
    database,
    table,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE table = 'events';
```

You can also check the cumulative replication event counters since server start:

```sql
SELECT
    event AS name,
    value
FROM system.events
WHERE event IN (
    'ReplicatedPartFetches',
    'ReplicatedPartFetchesOfMerged',
    'ReplicatedDataLoss'
);
```

The `ReplicatedDataLoss` counter should always be 0. If it is not, a part was lost and cannot be recovered from other replicas. Investigate immediately.

## Setting Up a Lag Check Script

A simple shell script to alert on replication lag:

```bash
#!/bin/bash
THRESHOLD=60
HOST="localhost"
PORT="9000"

LAG=$(clickhouse-client \
    --host "$HOST" \
    --port "$PORT" \
    --query "SELECT max(absolute_delay) FROM system.replicas" \
    2>/dev/null)

if [ -z "$LAG" ]; then
    echo "CRITICAL: Could not connect to ClickHouse"
    exit 2
fi

if [ "$LAG" -gt "$THRESHOLD" ]; then
    echo "WARNING: Replication lag is ${LAG}s (threshold: ${THRESHOLD}s)"
    exit 1
else
    echo "OK: Replication lag is ${LAG}s"
    exit 0
fi
```

Combine this with your monitoring system's check mechanism (Nagios, Sensu, or a custom cron) to get paged when lag grows.
