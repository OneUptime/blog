# How to Monitor PostgreSQL Replication Lag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Monitoring, Lag, High Availability, Streaming Replication

Description: A comprehensive guide to monitoring PostgreSQL replication lag, understanding lag metrics, and setting up alerts to ensure data consistency.

---

Replication lag is the delay between when data is written to the primary and when it appears on replicas. This guide covers monitoring strategies and tools.

## Understanding Replication Lag

Replication lag can be measured in:
- **Bytes** - Amount of WAL not yet applied
- **Time** - How far behind the replica is

## Check Lag on Primary

### Using pg_stat_replication

```sql
-- View all replicas and their lag
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS send_lag_bytes
FROM pg_stat_replication;
```

### Lag in Time (PostgreSQL 10+)

```sql
SELECT
    client_addr,
    application_name,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;
```

## Check Lag on Replica

### Current Lag Position

```sql
-- On replica: check how far behind
SELECT
    pg_last_wal_receive_lsn() AS received_lsn,
    pg_last_wal_replay_lsn() AS replayed_lsn,
    pg_wal_lsn_diff(
        pg_last_wal_receive_lsn(),
        pg_last_wal_replay_lsn()
    ) AS replay_lag_bytes;
```

### Lag in Seconds

```sql
-- Time since last replay (requires active writes)
SELECT
    CASE
        WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn()
        THEN 0
        ELSE EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
    END AS lag_seconds;
```

## Comprehensive Monitoring Query

```sql
-- Detailed replication status
SELECT
    pid,
    client_addr,
    application_name,
    state,
    sync_state,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)) AS send_lag,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn)) AS write_lag,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) AS flush_lag,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS replay_lag,
    write_lag AS write_lag_interval,
    flush_lag AS flush_lag_interval,
    replay_lag AS replay_lag_interval
FROM pg_stat_replication
ORDER BY replay_lag DESC NULLS LAST;
```

## Prometheus Monitoring

### postgres_exporter Metrics

```yaml
# Key replication metrics
pg_stat_replication_pg_wal_lsn_diff
pg_replication_lag_seconds
```

### Alert Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: postgresql-replication
    rules:
      - alert: PostgreSQLReplicationLagHigh
        expr: pg_replication_lag_seconds > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High replication lag detected"
          description: "Replica {{ $labels.instance }} is {{ $value }}s behind"

      - alert: PostgreSQLReplicationLagCritical
        expr: pg_replication_lag_seconds > 300
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical replication lag"
          description: "Replica {{ $labels.instance }} is {{ $value }}s behind"

      - alert: PostgreSQLReplicationDown
        expr: pg_replication_is_replica == 1 and pg_replication_lag_seconds == -1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Replication appears to be down"
```

## Monitoring Script

```bash
#!/bin/bash
# check_replication_lag.sh

THRESHOLD_WARNING=30
THRESHOLD_CRITICAL=300

LAG=$(psql -h replica -U postgres -t -c "
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::integer
WHERE pg_is_in_recovery();
")

if [ "$LAG" -gt "$THRESHOLD_CRITICAL" ]; then
    echo "CRITICAL: Replication lag is ${LAG}s"
    exit 2
elif [ "$LAG" -gt "$THRESHOLD_WARNING" ]; then
    echo "WARNING: Replication lag is ${LAG}s"
    exit 1
else
    echo "OK: Replication lag is ${LAG}s"
    exit 0
fi
```

## Grafana Dashboard Query

```sql
-- For Grafana time series
SELECT
    NOW() AS time,
    client_addr AS metric,
    EXTRACT(EPOCH FROM replay_lag)::float AS value
FROM pg_stat_replication
WHERE replay_lag IS NOT NULL;
```

## Slot Lag Monitoring

```sql
-- Monitor replication slot lag
SELECT
    slot_name,
    slot_type,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS slot_lag
FROM pg_replication_slots
ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC;
```

## Common Causes of Lag

| Cause | Solution |
|-------|----------|
| Network latency | Improve network, use compression |
| Slow replica disk | Use faster storage |
| Heavy replay load | Tune recovery settings |
| Long-running queries | Cancel blocking queries |
| Checkpoint storms | Tune checkpoint settings |

## Tuning for Lower Lag

```conf
# On replica - postgresql.conf
max_standby_streaming_delay = 30s
hot_standby_feedback = on

# Recovery tuning
recovery_min_apply_delay = 0  # No artificial delay
```

## Best Practices

1. **Set meaningful thresholds** - Based on RPO requirements
2. **Monitor all replicas** - Each may have different lag
3. **Alert on lag trends** - Not just absolute values
4. **Consider network latency** - Factor in expected delay
5. **Monitor slot lag** - Prevent WAL accumulation

## Conclusion

Replication lag monitoring is essential for high availability PostgreSQL deployments. Use pg_stat_replication, Prometheus metrics, and proper alerting to ensure data consistency across your cluster.
