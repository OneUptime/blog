# How to Implement VACUUM and Autovacuum in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, VACUUM, Autovacuum, Maintenance, Performance, Database

Description: A comprehensive guide to understanding and configuring VACUUM and autovacuum in PostgreSQL for optimal performance, covering dead tuple cleanup, bloat prevention, and tuning strategies.

---

VACUUM is PostgreSQL's garbage collection process that reclaims storage and prevents transaction ID wraparound. Understanding and properly configuring VACUUM is essential for maintaining database health. This guide covers everything from basic concepts to advanced tuning.

## Prerequisites

- PostgreSQL database access
- Understanding of PostgreSQL MVCC
- Access to server configuration

## Why VACUUM Matters

PostgreSQL uses Multi-Version Concurrency Control (MVCC):
- UPDATE creates a new row version, old version becomes "dead"
- DELETE marks rows as dead but doesn't remove them
- Dead rows ("dead tuples") accumulate and waste space

VACUUM:
1. Removes dead tuples
2. Updates visibility map
3. Updates statistics
4. Prevents transaction ID wraparound

## Types of VACUUM

### Regular VACUUM

```sql
-- VACUUM single table
VACUUM users;

-- VACUUM with statistics update
VACUUM ANALYZE users;

-- VACUUM entire database
VACUUM;
```

### VACUUM FULL

```sql
-- Rewrites entire table (locks table exclusively)
VACUUM FULL users;

-- Rarely needed - use with caution
```

| Type | Table Lock | Reclaims Space to OS | Speed |
|------|------------|---------------------|-------|
| VACUUM | No (concurrent) | No* | Fast |
| VACUUM FULL | Yes (exclusive) | Yes | Slow |

*Regular VACUUM allows space reuse but doesn't shrink files.

## Understanding Dead Tuples

### Check Dead Tuples

```sql
-- Current dead tuple counts
SELECT
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;
```

### Check Table Bloat

```sql
-- Estimate table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
    round(100.0 * pg_relation_size(schemaname || '.' || tablename) /
        nullif(pg_total_relation_size(schemaname || '.' || tablename), 0), 2) AS table_pct
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;
```

## Autovacuum Configuration

### Enable Autovacuum

```conf
# postgresql.conf
autovacuum = on                          # Enable autovacuum
track_counts = on                        # Required for autovacuum
```

### Autovacuum Workers

```conf
# Number of autovacuum workers
autovacuum_max_workers = 3               # Default: 3

# Delay between autovacuum runs
autovacuum_naptime = 1min                # Default: 1min
```

### Threshold Settings

```conf
# Minimum rows to trigger vacuum
autovacuum_vacuum_threshold = 50         # Default: 50

# Scale factor (fraction of table)
autovacuum_vacuum_scale_factor = 0.1     # Default: 0.1 (10%)

# Minimum rows to trigger analyze
autovacuum_analyze_threshold = 50        # Default: 50
autovacuum_analyze_scale_factor = 0.05   # Default: 0.05 (5%)
```

Vacuum triggers when:
```
dead_tuples >= threshold + (scale_factor * table_rows)
```

### Cost Settings

```conf
# Cost-based vacuum delay
vacuum_cost_delay = 0                    # Delay after cost limit (ms)
vacuum_cost_limit = 200                  # Cost limit before delay

# Autovacuum-specific (overrides above)
autovacuum_vacuum_cost_delay = 2ms       # Default: 2ms
autovacuum_vacuum_cost_limit = -1        # Default: uses vacuum_cost_limit
```

Cost values:
```conf
vacuum_cost_page_hit = 1                 # Page found in buffer
vacuum_cost_page_miss = 10               # Page read from disk
vacuum_cost_page_dirty = 20              # Page modified
```

### Recommended Production Settings

```conf
# Worker settings
autovacuum_max_workers = 4

# Lower thresholds for more frequent vacuuming
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.05    # 5% instead of 10%
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.025  # 2.5% instead of 5%

# Reduce throttling for faster vacuuming
autovacuum_vacuum_cost_delay = 2ms
autovacuum_vacuum_cost_limit = 1000      # Higher limit

# Memory for autovacuum
autovacuum_work_mem = 512MB              # Or -1 to use maintenance_work_mem
```

## Per-Table Settings

### Configure Individual Tables

```sql
-- More aggressive vacuum for high-churn tables
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_vacuum_threshold = 1000,
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_vacuum_cost_delay = 0
);

-- Less aggressive for large, stable tables
ALTER TABLE historical_data SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_vacuum_threshold = 10000
);

-- Check table settings
SELECT relname, reloptions
FROM pg_class
WHERE relname = 'orders';
```

### Remove Per-Table Settings

```sql
ALTER TABLE orders RESET (
    autovacuum_vacuum_scale_factor,
    autovacuum_vacuum_threshold
);
```

## Transaction ID Wraparound

### Understanding Wraparound

PostgreSQL uses 32-bit transaction IDs (XIDs):
- ~4 billion possible XIDs
- After ~2 billion transactions, old XIDs become "in the future"
- Must vacuum to "freeze" old XIDs

### Check XID Age

```sql
-- Database age
SELECT
    datname,
    age(datfrozenxid) AS xid_age,
    round(100.0 * age(datfrozenxid) / 2147483647, 2) AS pct_to_wraparound
FROM pg_database
ORDER BY age(datfrozenxid) DESC;

-- Table age
SELECT
    schemaname,
    relname,
    age(relfrozenxid) AS xid_age,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) AS size
FROM pg_stat_user_tables
ORDER BY age(relfrozenxid) DESC
LIMIT 20;
```

### Anti-Wraparound Settings

```conf
# Age at which autovacuum becomes aggressive
autovacuum_freeze_max_age = 200000000    # Default: 200 million

# Age at which vacuum freezes tuples
vacuum_freeze_min_age = 50000000         # Default: 50 million
vacuum_freeze_table_age = 150000000      # Default: 150 million

# Multi-transaction age limits
autovacuum_multixact_freeze_max_age = 400000000
vacuum_multixact_freeze_min_age = 5000000
vacuum_multixact_freeze_table_age = 150000000
```

### Force Aggressive Freeze

```sql
-- Freeze all old transactions
VACUUM (FREEZE) large_table;
```

## Monitoring Autovacuum

### Current Autovacuum Activity

```sql
-- Active autovacuum processes
SELECT
    pid,
    datname,
    relid::regclass AS table_name,
    phase,
    heap_blks_total,
    heap_blks_scanned,
    index_vacuum_count,
    max_dead_tuples
FROM pg_stat_progress_vacuum;
```

### Autovacuum History

```sql
-- Recent vacuum/analyze activity
SELECT
    schemaname,
    relname,
    last_vacuum,
    last_autovacuum,
    vacuum_count,
    autovacuum_count,
    last_analyze,
    last_autoanalyze,
    analyze_count,
    autoanalyze_count
FROM pg_stat_user_tables
ORDER BY last_autovacuum DESC NULLS LAST
LIMIT 20;
```

### Tables Needing Vacuum

```sql
-- Tables approaching vacuum threshold
SELECT
    schemaname,
    relname,
    n_dead_tup,
    n_live_tup,
    round(100.0 * n_dead_tup / nullif(n_live_tup, 0), 2) AS dead_pct,
    (SELECT setting::int FROM pg_settings WHERE name = 'autovacuum_vacuum_threshold') +
    (SELECT setting::float FROM pg_settings WHERE name = 'autovacuum_vacuum_scale_factor') *
    n_live_tup AS vacuum_threshold
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC
LIMIT 20;
```

## Manual VACUUM Operations

### Basic VACUUM

```sql
-- Vacuum single table
VACUUM users;

-- Vacuum with analyze
VACUUM ANALYZE users;

-- Verbose output
VACUUM VERBOSE users;
```

### VACUUM Options

```sql
-- Parallel vacuum (PostgreSQL 13+)
VACUUM (PARALLEL 4) large_table;

-- Skip locked tables
VACUUM (SKIP_LOCKED) users;

-- Disable index cleanup (faster, for emergency)
VACUUM (INDEX_CLEANUP OFF) users;

-- Truncate empty pages at end
VACUUM (TRUNCATE) users;
```

### Full Vacuum (Last Resort)

```sql
-- WARNING: Locks table exclusively
-- Use only when necessary
VACUUM FULL users;

-- Alternative: pg_repack (no locks)
-- pg_repack --table=users dbname
```

## Troubleshooting

### Autovacuum Not Running

```sql
-- Check if autovacuum is enabled
SHOW autovacuum;

-- Check autovacuum worker activity
SELECT * FROM pg_stat_activity WHERE backend_type = 'autovacuum worker';

-- Check for blocking
SELECT
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.backend_type = 'autovacuum worker';
```

### Autovacuum Taking Too Long

```sql
-- Check progress
SELECT * FROM pg_stat_progress_vacuum;

-- May need to:
-- 1. Increase autovacuum_vacuum_cost_limit
-- 2. Decrease autovacuum_vacuum_cost_delay
-- 3. Increase autovacuum_max_workers
```

### High Dead Tuple Count

```sql
-- Check for long-running transactions (prevent vacuum)
SELECT
    pid,
    now() - xact_start AS xact_duration,
    state,
    query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start
LIMIT 10;

-- Check for old replication slots
SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots;
```

## Best Practices

### General Guidelines

1. **Keep autovacuum enabled** - Never disable it
2. **Monitor dead tuple counts** - Alert when high
3. **Tune per table** - High-churn tables need lower thresholds
4. **Avoid long transactions** - They block vacuum
5. **Monitor XID age** - Prevent wraparound

### Maintenance Schedule

```sql
-- Weekly: Check for tables needing attention
SELECT relname, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;

-- Monthly: Check bloat
-- Use pgstattuple extension
CREATE EXTENSION pgstattuple;
SELECT * FROM pgstattuple('users');
```

## Conclusion

Proper VACUUM configuration is essential for PostgreSQL health:

1. **Keep autovacuum enabled** and properly tuned
2. **Monitor dead tuples** and XID age
3. **Tune per-table** settings for high-churn tables
4. **Avoid VACUUM FULL** unless absolutely necessary
5. **Prevent long-running transactions** that block vacuum

Well-tuned autovacuum prevents bloat, maintains query performance, and ensures database stability.
