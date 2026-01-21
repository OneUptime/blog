# How to Set Up Synchronous Replication in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Synchronous Replication, High Availability, Zero Data Loss, Durability

Description: A comprehensive guide to configuring PostgreSQL synchronous replication for zero data loss, covering configuration options, quorum-based replication, performance considerations, and failover handling.

---

Synchronous replication ensures that transactions are committed on both primary and standby before being acknowledged to the client. This provides zero data loss guarantees at the cost of increased latency. This guide covers complete synchronous replication setup.

## Prerequisites

- PostgreSQL 14+ installed
- Streaming replication already configured
- Low-latency network between primary and standbys
- Understanding of durability vs performance tradeoffs

## Synchronous vs Asynchronous Replication

| Aspect | Synchronous | Asynchronous |
|--------|-------------|--------------|
| Data Loss | Zero | Possible |
| Commit Latency | Higher (network RTT) | Lower |
| Availability | Lower (standby required) | Higher |
| Use Case | Critical data | General purpose |

## Basic Synchronous Configuration

### On Primary Server

```conf
# postgresql.conf

# Enable synchronous commit
synchronous_commit = on

# Define synchronous standbys
synchronous_standby_names = 'standby1'

# Streaming replication settings
wal_level = replica
max_wal_senders = 10
```

### Synchronous Commit Levels

```conf
# Options for synchronous_commit:

# off - No sync, fastest, risk of data loss
synchronous_commit = off

# local - Sync to local disk only
synchronous_commit = local

# remote_write - Sync to standby OS (not disk)
synchronous_commit = remote_write

# on (remote_apply) - Sync to standby WAL
synchronous_commit = on

# remote_apply - Sync until applied on standby
synchronous_commit = remote_apply
```

### Standby Configuration

```conf
# postgresql.conf on standby

# Set application_name to match synchronous_standby_names
primary_conninfo = 'host=primary.example.com port=5432 user=replicator password=xxx application_name=standby1'
```

Or set application_name in recovery configuration:

```conf
# postgresql.auto.conf (created by pg_basebackup -R)
primary_conninfo = 'host=primary.example.com port=5432 user=replicator password=xxx application_name=standby1'
```

## Multiple Synchronous Standbys

### Priority-Based (First Match)

```conf
# First standby in list that is connected becomes sync
synchronous_standby_names = 'FIRST 1 (standby1, standby2, standby3)'

# Equivalent shorthand
synchronous_standby_names = 'standby1, standby2, standby3'
```

### Quorum-Based

```conf
# Wait for ANY 2 standbys to acknowledge
synchronous_standby_names = 'ANY 2 (standby1, standby2, standby3)'

# Wait for all 3
synchronous_standby_names = 'ANY 3 (standby1, standby2, standby3)'
```

### Mixed Priority and Quorum

```conf
# First 2 from the priority list
synchronous_standby_names = 'FIRST 2 (standby1, standby2, standby3)'
```

## Verify Synchronous Replication

### Check Primary Status

```sql
-- View synchronous standbys
SELECT
    application_name,
    client_addr,
    state,
    sync_state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn
FROM pg_stat_replication;

-- sync_state values:
-- 'sync' - Synchronous standby
-- 'potential' - Could become sync
-- 'async' - Asynchronous standby
-- 'quorum' - Part of quorum group
```

### Check Current Configuration

```sql
-- Show synchronous settings
SHOW synchronous_commit;
SHOW synchronous_standby_names;
```

## Performance Tuning

### Network Optimization

```bash
# Reduce network latency between servers
# 1. Use dedicated replication network
# 2. Place servers in same datacenter/rack
# 3. Use high-speed interconnect

# Test network latency
ping -c 100 standby1.example.com | tail -1
```

### WAL Buffer Tuning

```conf
# postgresql.conf on primary

# Increase WAL buffers for better batching
wal_buffers = 64MB

# Enable WAL compression
wal_compression = on
```

### Commit Batching

```sql
-- Use transactions to batch multiple operations
BEGIN;
INSERT INTO orders VALUES (...);
INSERT INTO order_items VALUES (...);
UPDATE inventory SET ...;
COMMIT;  -- Single sync wait for all operations
```

### Per-Transaction Sync Control

```sql
-- Disable sync for specific transaction (less critical data)
SET LOCAL synchronous_commit = off;
INSERT INTO logs VALUES (...);

-- Or in transaction
BEGIN;
SET LOCAL synchronous_commit = off;
INSERT INTO activity_log VALUES (...);
COMMIT;  -- Won't wait for standby
```

## Handling Standby Failures

### Automatic Failback to Async

When all synchronous standbys are unavailable, commits will hang by default:

```conf
# postgresql.conf

# Option 1: Block until standby returns (default, safest)
synchronous_commit = on

# Option 2: Continue with degraded durability
# Application must handle this
```

### Manual Fallback

```sql
-- If standby is down and commits are blocking
-- Temporarily disable synchronous commit
ALTER SYSTEM SET synchronous_commit = local;
SELECT pg_reload_conf();

-- When standby returns
ALTER SYSTEM SET synchronous_commit = on;
SELECT pg_reload_conf();
```

### Monitoring Standby Health

```sql
-- Check if sync standbys are connected
SELECT COUNT(*) AS sync_standbys
FROM pg_stat_replication
WHERE sync_state IN ('sync', 'quorum');

-- Alert if no sync standbys
-- Set up monitoring to alert when sync_standbys = 0
```

### Connection Timeout

```conf
# On standby: Keep connection alive
primary_conninfo = '... keepalives=1 keepalives_idle=30 keepalives_interval=10 keepalives_count=3'

# On primary: Detect dead standbys faster
wal_sender_timeout = 30s  # Default: 60s
```

## Quorum Configuration Examples

### Two Datacenter Setup

```conf
# 2 standbys in DC1, 2 in DC2
# Require acknowledgment from both DCs
synchronous_standby_names = 'FIRST 2 (dc1_standby1, dc2_standby1, dc1_standby2, dc2_standby2)'
```

### Geographic Distribution

```conf
# 3 regions, quorum of 2
synchronous_standby_names = 'ANY 2 (us_east, us_west, eu_west)'
```

### Local + Remote Sync

```conf
# Always sync to local, optionally to remote
synchronous_standby_names = 'FIRST 1 (local_standby), ANY 1 (remote_dc1, remote_dc2)'
```

## Synchronous with Patroni

```yaml
# patroni.yml
bootstrap:
  dcs:
    synchronous_mode: true
    synchronous_mode_strict: false  # Allow async if no sync available

    postgresql:
      parameters:
        synchronous_commit: on

# Or for strict mode (never allow data loss)
bootstrap:
  dcs:
    synchronous_mode: true
    synchronous_mode_strict: true  # Block writes if no sync standby
```

### Patroni Synchronous Status

```bash
# Check sync status
patronictl -c /etc/patroni/patroni.yml list

# Output shows Sync Standby column
# + Cluster: postgres-cluster --+---------+-----------+----+
# | Member   | Host      | Role         | State     | TL |
# +----------+-----------+--------------+-----------+----+
# | pg-node1 | 10.0.0.11 | Leader       | running   | 3  |
# | pg-node2 | 10.0.0.12 | Sync Standby | streaming | 3  |
# | pg-node3 | 10.0.0.13 | Replica      | streaming | 3  |
# +----------+-----------+--------------+-----------+----+
```

## Measuring Replication Lag

### On Primary

```sql
-- Check sync standby lag
SELECT
    application_name,
    pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS flush_lag_bytes,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication
WHERE sync_state = 'sync';
```

### On Standby

```sql
-- Check local lag
SELECT
    pg_last_wal_receive_lsn() AS received,
    pg_last_wal_replay_lsn() AS replayed,
    pg_wal_lsn_diff(
        pg_last_wal_receive_lsn(),
        pg_last_wal_replay_lsn()
    ) AS replay_lag_bytes;
```

## Commit Latency Analysis

### Measure Commit Time

```sql
-- Benchmark commit latency
\timing on

BEGIN;
INSERT INTO test_table VALUES (1);
COMMIT;

-- Compare with async
SET synchronous_commit = off;
BEGIN;
INSERT INTO test_table VALUES (2);
COMMIT;
```

### Latency Statistics

```sql
-- Enable timing statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Check average commit times
SELECT
    substring(query, 1, 50) AS query,
    calls,
    mean_exec_time AS avg_ms,
    stddev_exec_time AS stddev_ms
FROM pg_stat_statements
WHERE query LIKE 'COMMIT%' OR query LIKE 'INSERT%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Disaster Recovery Considerations

### RPO = 0 (Zero Data Loss)

```conf
# Strict synchronous - no commits without standby
synchronous_commit = on
synchronous_standby_names = 'standby1'

# With Patroni
synchronous_mode_strict: true
```

### Balanced Approach

```conf
# Sync to multiple standbys for redundancy
synchronous_standby_names = 'ANY 2 (standby1, standby2, standby3)'

# Allows failover if one standby fails
```

### Graceful Degradation

```python
# Application-level fallback
def insert_critical_data(data):
    try:
        # Try synchronous commit
        conn.execute("SET LOCAL synchronous_commit = on")
        conn.execute("INSERT INTO critical_table VALUES (%s)", data)
        conn.commit()
    except OperationalError as e:
        if "synchronous standby" in str(e):
            # Fallback: queue for later sync
            queue_for_later(data)
            # Alert operators
            alert("Sync replication unavailable")
        else:
            raise
```

## Monitoring and Alerting

### Prometheus Metrics

```yaml
# Alert rules
groups:
  - name: postgresql_sync_replication
    rules:
      - alert: PostgreSQLNoSyncStandby
        expr: pg_stat_replication_sync_state{sync_state="sync"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "No synchronous standby available"

      - alert: PostgreSQLSyncLagHigh
        expr: pg_stat_replication_flush_lag_bytes > 1048576
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High synchronous replication lag"
```

### Health Check Query

```sql
-- Comprehensive sync status check
SELECT
    CASE
        WHEN COUNT(*) FILTER (WHERE sync_state = 'sync') > 0 THEN 'OK'
        WHEN COUNT(*) FILTER (WHERE sync_state = 'potential') > 0 THEN 'DEGRADED'
        ELSE 'CRITICAL'
    END AS sync_status,
    COUNT(*) AS total_standbys,
    COUNT(*) FILTER (WHERE sync_state = 'sync') AS sync_standbys,
    MAX(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) AS max_flush_lag_bytes
FROM pg_stat_replication;
```

## Best Practices

1. **Network quality** - Sync replication is only as fast as your network
2. **Multiple sync standbys** - Use quorum for availability
3. **Monitor lag** - Even sync has tiny lag during commit
4. **Test failover** - Ensure sync standby can become primary
5. **Consider workload** - Batch commits reduce sync overhead
6. **Per-transaction control** - Use local commit for non-critical data
7. **Plan for degradation** - Have strategy when sync unavailable

## Conclusion

PostgreSQL synchronous replication provides:

1. **Zero data loss** - Commits wait for standby acknowledgment
2. **Flexible configuration** - Priority and quorum modes
3. **Per-transaction control** - Choose durability level
4. **Integration with HA tools** - Works with Patroni

Balance durability requirements against performance impact based on your application's specific needs.
