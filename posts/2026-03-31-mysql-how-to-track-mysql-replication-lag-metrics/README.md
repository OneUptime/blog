# How to Track MySQL Replication Lag Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Lag Metrics, Monitoring, Performance

Description: Learn how to monitor MySQL replication lag using SHOW REPLICA STATUS, performance_schema, and external tools to keep your replica in sync with the primary.

---

## What Is Replication Lag?

Replication lag is the delay between a change being committed on the primary MySQL server and that same change being applied on the replica. High replication lag means the replica is reading stale data and is at risk of falling far behind, which can affect read-scaling reliability, failover RPO, and backup integrity.

## The Primary Metric: Seconds_Behind_Source

The simplest way to check replication lag is with `SHOW REPLICA STATUS`:

```sql
-- MySQL 8.0+ syntax
SHOW REPLICA STATUS\G

-- MySQL 5.7 and earlier
SHOW SLAVE STATUS\G
```

The key field is `Seconds_Behind_Source` (formerly `Seconds_Behind_Master`):

```text
Seconds_Behind_Source: 42
```

This value represents how far behind the replica's SQL thread is from the current time, measured in seconds. A value of `NULL` means the replica SQL thread is not running.

## Understanding the Limitations of Seconds_Behind_Source

`Seconds_Behind_Source` can be misleading:

- It resets to 0 when the replica catches up with the relay log, even if the relay log itself is behind the primary's binary log.
- It does not account for network delay fetching binary logs from the primary.
- It can fluctuate due to large transactions being applied.

## More Accurate Lag with performance_schema

MySQL's `performance_schema.replication_applier_status_by_worker` gives per-worker lag for parallel replication:

```sql
SELECT
  WORKER_ID,
  APPLYING_TRANSACTION,
  APPLYING_TRANSACTION_LAST_TRANSIENT_ERROR_MESSAGE,
  LAST_APPLIED_TRANSACTION_END_APPLY_TIMESTAMP,
  LAST_APPLIED_TRANSACTION_START_APPLY_TIMESTAMP,
  TIMESTAMPDIFF(
    SECOND,
    LAST_APPLIED_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP,
    NOW()
  ) AS lag_seconds
FROM performance_schema.replication_applier_status_by_worker;
```

This lag is calculated from the transaction's original commit timestamp on the primary to the current time, which is more accurate than `Seconds_Behind_Source`.

## Tracking Lag with Heartbeat Tables

A heartbeat table approach gives precise, real-time lag measurement by writing a timestamp to the primary periodically and reading it on the replica:

```sql
-- On primary: create heartbeat table
CREATE TABLE replication_heartbeat (
  server_id INT PRIMARY KEY,
  ts DATETIME(3) NOT NULL
);

-- On primary: update heartbeat every second (via cron or event)
INSERT INTO replication_heartbeat (server_id, ts)
VALUES (@@server_id, NOW(3))
ON DUPLICATE KEY UPDATE ts = NOW(3);
```

On the replica, measure lag by comparing the replicated heartbeat to the current time:

```sql
-- On replica: calculate lag
SELECT TIMESTAMPDIFF(MICROSECOND, ts, NOW(3)) / 1000000.0 AS lag_seconds
FROM replication_heartbeat
WHERE server_id = <primary_server_id>;
```

Tools like `pt-heartbeat` from the Percona Toolkit automate this pattern:

```bash
# Run on primary (writes heartbeats)
pt-heartbeat --host=primary_host --user=monitor --password=pass \
  --database=mydb --update --daemonize

# Run on replica (reads lag)
pt-heartbeat --host=replica_host --user=monitor --password=pass \
  --database=mydb --monitor --master-server-id=1
```

## Monitoring Replication Lag with Prometheus and mysqld_exporter

The Prometheus `mysqld_exporter` exposes `mysql_slave_status_seconds_behind_master` as a metric:

```bash
# Install and run mysqld_exporter
./mysqld_exporter --config.my-cnf=/etc/.my.cnf
```

A sample Prometheus alerting rule:

```yaml
groups:
  - name: mysql_replication
    rules:
      - alert: MySQLReplicationLagHigh
        expr: mysql_slave_status_seconds_behind_master > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MySQL replication lag is {{ $value }}s on {{ $labels.instance }}"
```

## Key Variables That Affect Replication Lag

```sql
-- Check parallel replication settings
SHOW VARIABLES LIKE 'replica_parallel_%';
SHOW VARIABLES LIKE 'binlog_transaction_dependency_tracking';
```

Increasing parallel applier threads can reduce lag under write-heavy workloads:

```ini
[mysqld]
replica_parallel_workers = 8
replica_parallel_type = LOGICAL_CLOCK
binlog_transaction_dependency_tracking = WRITESET
```

## Summary

MySQL replication lag is tracked primarily through `Seconds_Behind_Source` in `SHOW REPLICA STATUS`, but this metric has known limitations. For more accurate monitoring, use `performance_schema.replication_applier_status_by_worker` for per-transaction timestamps, or implement a heartbeat table with `pt-heartbeat`. Export lag metrics to Prometheus via `mysqld_exporter` and set alerting thresholds appropriate for your application's tolerance for stale reads.
