# How to Handle Table Bloat in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Table Bloat, VACUUM, Performance, Storage

Description: A guide to detecting and remedying PostgreSQL table bloat, covering VACUUM operations, monitoring, and prevention strategies.

---

Table bloat occurs when dead tuples accumulate, wasting storage and degrading performance. This guide covers detection and remediation.

## What Causes Bloat

- MVCC leaves dead tuples after UPDATE/DELETE
- Autovacuum not keeping up
- Long-running transactions blocking vacuum
- Disabled autovacuum

## Detect Bloat

### Using pgstattuple

```sql
CREATE EXTENSION pgstattuple;

SELECT
    schemaname || '.' || relname AS table,
    pg_size_pretty(pg_relation_size(relid)) AS size,
    n_dead_tup,
    n_live_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

### Detailed Bloat Analysis

```sql
SELECT * FROM pgstattuple('users');

-- Key metrics:
-- dead_tuple_count: Number of dead tuples
-- dead_tuple_percent: Percentage of dead tuples
-- free_space: Unused space in table
-- free_percent: Percentage of free space
```

## Fix Bloat

### Regular VACUUM

```sql
-- Mark dead tuples for reuse (doesn't shrink table)
VACUUM users;

-- With verbose output
VACUUM VERBOSE users;
```

### VACUUM FULL (Locks Table)

```sql
-- Rewrites table, reclaims disk space
-- WARNING: Exclusive lock on table
VACUUM FULL users;
```

### pg_repack (No Lock)

```bash
# Install pg_repack
sudo apt install postgresql-16-repack

# Repack table without locking
pg_repack -d myapp -t users
```

```sql
-- Or via SQL
CREATE EXTENSION pg_repack;
```

### CLUSTER (Reorders Data)

```sql
-- Reorder table by index (locks table)
CLUSTER users USING idx_users_created_at;
```

## Prevention

### Tune Autovacuum

```conf
# postgresql.conf
autovacuum = on
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
autovacuum_vacuum_cost_delay = 2ms
autovacuum_vacuum_cost_limit = 1000
```

### Per-Table Settings

```sql
ALTER TABLE high_churn_table SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_vacuum_threshold = 1000
);
```

## Monitoring

```sql
-- Tables needing vacuum
SELECT
    schemaname,
    relname,
    n_dead_tup,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

## Best Practices

1. **Monitor dead tuple counts** - Regular checks
2. **Tune autovacuum** - For your workload
3. **Use pg_repack** - For online maintenance
4. **Avoid long transactions** - They block vacuum
5. **Schedule maintenance windows** - For VACUUM FULL if needed

## Conclusion

Prevent bloat with proper autovacuum configuration. Use pg_repack for online remediation and VACUUM FULL only when necessary during maintenance windows.
