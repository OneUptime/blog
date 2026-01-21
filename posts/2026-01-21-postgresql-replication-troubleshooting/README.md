# How to Troubleshoot PostgreSQL Replication Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Troubleshooting, Streaming Replication, High Availability

Description: A comprehensive guide to diagnosing and fixing common PostgreSQL replication problems, from connection issues to lag and conflicts.

---

PostgreSQL replication issues can range from connection failures to data conflicts. This guide covers systematic troubleshooting approaches.

## Common Replication Problems

| Problem | Symptoms |
|---------|----------|
| Connection failure | Replica not connecting |
| Replication lag | Data delay on replica |
| Replication slot bloat | Disk filling up |
| Conflict errors | Queries failing on replica |
| WAL not available | Replica requesting deleted WAL |

## Checking Replication Status

### On Primary

```sql
-- Check connected replicas
SELECT
    pid,
    client_addr,
    state,
    sent_lsn,
    replay_lsn,
    sync_state
FROM pg_stat_replication;
```

### On Replica

```sql
-- Check recovery status
SELECT
    pg_is_in_recovery() AS is_replica,
    pg_last_wal_receive_lsn() AS received_lsn,
    pg_last_wal_replay_lsn() AS replayed_lsn,
    pg_last_xact_replay_timestamp() AS last_replay_time;
```

## Connection Issues

### Symptoms
- Replica not appearing in pg_stat_replication
- Connection refused errors in replica logs

### Diagnosis

```bash
# Check replica logs
tail -f /var/log/postgresql/postgresql-16-main.log

# Common errors:
# "could not connect to the primary server"
# "FATAL: no pg_hba.conf entry for replication"
```

### Solutions

```conf
# On primary - pg_hba.conf
host replication replicator 10.0.0.0/8 scram-sha-256

# Verify settings
# postgresql.conf
max_wal_senders = 10
wal_level = replica
```

```bash
# Test connection from replica
psql "host=primary port=5432 user=replicator dbname=postgres"
```

## WAL Not Available

### Symptoms

```
FATAL: requested WAL segment 000000010000000000000005 has already been removed
```

### Solutions

```sql
-- Use replication slots (prevents WAL removal)
SELECT pg_create_physical_replication_slot('replica1_slot');
```

```conf
# Or increase WAL retention
wal_keep_size = 1GB  # PostgreSQL 13+
# wal_keep_segments = 64  # Older versions
```

### Recovery

```bash
# If replica is too far behind, re-sync
pg_basebackup -h primary -U replicator -D /var/lib/postgresql/16/main -R -P
```

## High Replication Lag

### Diagnosis

```sql
-- Check lag on primary
SELECT
    client_addr,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS lag
FROM pg_stat_replication;

-- Check what's blocking on replica
SELECT * FROM pg_stat_activity
WHERE state != 'idle'
AND backend_type = 'client backend';
```

### Common Causes and Fixes

```sql
-- Cause: Long-running queries blocking replay
-- Fix: Cancel blocking queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
AND query_start < NOW() - INTERVAL '10 minutes';
```

```conf
# Cause: Slow replay
# Fix: Tune replica settings
max_standby_streaming_delay = 30s  # Allow queries to be cancelled faster
hot_standby_feedback = on  # Prevent vacuum conflicts
```

## Replication Slot Bloat

### Symptoms

```sql
-- Large slot lag
SELECT
    slot_name,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots;
```

### Solutions

```sql
-- Drop inactive slot
SELECT pg_drop_replication_slot('old_replica_slot');

-- Set maximum slot lag (PostgreSQL 13+)
ALTER SYSTEM SET max_slot_wal_keep_size = '10GB';
SELECT pg_reload_conf();
```

## Conflict Errors on Hot Standby

### Symptoms

```
ERROR: canceling statement due to conflict with recovery
DETAIL: User query might have needed to see row versions that must be removed.
```

### Solutions

```conf
# Option 1: Increase delay tolerance
max_standby_streaming_delay = 300s

# Option 2: Enable feedback
hot_standby_feedback = on

# Option 3: Use old_snapshot_threshold
old_snapshot_threshold = 60min
```

## Synchronous Replication Issues

### Symptoms
- Primary blocked waiting for sync replica
- Writes hanging

### Diagnosis

```sql
-- Check waiting transactions
SELECT * FROM pg_stat_activity
WHERE wait_event_type = 'Client'
AND wait_event = 'SyncRep';

-- Check sync status
SELECT * FROM pg_stat_replication
WHERE sync_state IN ('sync', 'quorum');
```

### Emergency Fix

```sql
-- Temporarily disable sync replication
ALTER SYSTEM SET synchronous_standby_names = '';
SELECT pg_reload_conf();
```

## Timeline Divergence

### Symptoms

```
FATAL: timeline 2 of the primary does not match recovery target timeline 1
```

### Solution

```bash
# Resync replica from primary
pg_basebackup -h primary -U replicator -D /var/lib/postgresql/16/main -R -P
```

## Network Issues

### Diagnosis

```bash
# Test connectivity
nc -zv primary 5432

# Check latency
ping primary

# Test bandwidth
iperf3 -c primary
```

### Tuning

```conf
# Increase timeouts
wal_sender_timeout = 120s
wal_receiver_timeout = 120s

# Use compression over slow links
wal_compression = on
```

## Logical Replication Issues

### Publication/Subscription Not Syncing

```sql
-- Check subscription status
SELECT * FROM pg_stat_subscription;

-- Check for errors
SELECT * FROM pg_subscription;

-- Resync table
ALTER SUBSCRIPTION mysub REFRESH PUBLICATION;
```

### Conflict Resolution

```sql
-- Skip conflicting transaction
ALTER SUBSCRIPTION mysub DISABLE;
SELECT pg_replication_origin_advance('pg_xxxxx', 'lsn_value');
ALTER SUBSCRIPTION mysub ENABLE;
```

## Troubleshooting Checklist

1. Check logs on both primary and replica
2. Verify network connectivity
3. Check pg_stat_replication on primary
4. Check recovery status on replica
5. Verify replication slots
6. Check for blocking queries
7. Review configuration settings

## Best Practices

1. **Monitor proactively** - Catch issues early
2. **Use replication slots** - Prevent WAL removal
3. **Set appropriate timeouts** - Based on network
4. **Test failover regularly** - Verify recovery works
5. **Keep replicas close** - Minimize network latency

## Conclusion

PostgreSQL replication troubleshooting requires systematic diagnosis. Check logs, verify connectivity, monitor lag, and address conflicts promptly to maintain healthy replication.
