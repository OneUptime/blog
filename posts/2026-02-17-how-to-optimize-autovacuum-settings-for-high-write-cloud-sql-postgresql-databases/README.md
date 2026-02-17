# How to Optimize Autovacuum Settings for High-Write Cloud SQL PostgreSQL Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, Autovacuum, Database Tuning, Performance

Description: Learn how to tune PostgreSQL autovacuum settings on Cloud SQL to prevent table bloat, avoid transaction ID wraparound, and maintain query performance on high-write workloads.

---

PostgreSQL uses Multi-Version Concurrency Control (MVCC), which means updates and deletes do not remove old row versions immediately. Instead, they create new versions and mark old ones as dead. Autovacuum is the background process that cleans up these dead rows. When autovacuum falls behind on a high-write database, you get table bloat (wasted disk space), degraded query performance (index scans hit dead rows), and eventually the risk of transaction ID wraparound - a situation where PostgreSQL stops accepting writes entirely.

On Cloud SQL for PostgreSQL, you have access to the autovacuum tuning parameters through database flags. Getting these right is critical for any database handling significant write volume.

## Understanding the Problem

Let me explain why autovacuum matters with a concrete example. Suppose you have an `events` table that receives 10,000 inserts per minute and 5,000 updates per minute. Each update creates a dead tuple. In one hour, you accumulate 300,000 dead tuples.

If autovacuum is not keeping up:
- The table size grows continuously even though live row count stays stable
- Index scans slow down as they skip over dead tuples
- Buffer cache fills with dead data, reducing cache hit rates
- Eventually, you hit the transaction ID wraparound threshold

## Checking Current Autovacuum Health

First, assess whether autovacuum is keeping up on your Cloud SQL instance.

```sql
-- Check dead tuple counts across all tables
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS live_tuples,
  n_dead_tup AS dead_tuples,
  ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) AS dead_pct,
  last_autovacuum,
  last_autoanalyze,
  autovacuum_count,
  autoanalyze_count
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;
```

If you see tables with a high dead tuple percentage (above 10-20%) or tables where `last_autovacuum` was a long time ago, autovacuum is falling behind.

```sql
-- Check for tables approaching transaction ID wraparound
SELECT
  c.oid::regclass AS table_name,
  age(c.relfrozenxid) AS xid_age,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  ROUND(age(c.relfrozenxid)::numeric / 2000000000 * 100, 2) AS pct_to_wraparound
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY age(c.relfrozenxid) DESC
LIMIT 20;
```

If any table's `pct_to_wraparound` is above 50%, you need to address this urgently.

## Key Autovacuum Parameters

Here are the parameters that matter most, with their defaults and recommended values for high-write workloads.

| Parameter | Default | Recommended | Purpose |
|---|---|---|---|
| `autovacuum_vacuum_threshold` | 50 | 50 | Min dead tuples before vacuum |
| `autovacuum_vacuum_scale_factor` | 0.2 | 0.01-0.05 | Fraction of table size to trigger vacuum |
| `autovacuum_max_workers` | 3 | 5-8 | Max concurrent autovacuum processes |
| `autovacuum_naptime` | 60s | 15-30s | Time between autovacuum checks |
| `autovacuum_vacuum_cost_delay` | 2ms | 0-2ms | Delay between vacuum I/O operations |
| `autovacuum_vacuum_cost_limit` | -1 (200) | 1000-2000 | I/O budget per vacuum cycle |

## Tuning the Settings on Cloud SQL

In Cloud SQL, you set these as database flags through the console or gcloud CLI.

### Step 1: Increase Autovacuum Workers

```bash
# Increase the number of autovacuum workers
gcloud sql instances patch MY_INSTANCE \
  --database-flags=autovacuum_max_workers=6
```

More workers means more tables can be vacuumed in parallel. For instances with many active tables, this is the first thing to increase.

### Step 2: Lower the Scale Factor

The default scale factor of 0.2 means autovacuum triggers after 20% of the table's rows are dead. For a 10 million row table, that is 2 million dead tuples before cleanup starts. Lower this significantly for high-write tables.

```bash
# Lower the vacuum scale factor to trigger vacuum more frequently
gcloud sql instances patch MY_INSTANCE \
  --database-flags=autovacuum_vacuum_scale_factor=0.02,autovacuum_analyze_scale_factor=0.01
```

With a scale factor of 0.02, vacuum triggers after 2% of rows are dead - 200,000 dead tuples on a 10 million row table.

### Step 3: Increase the Cost Limit

The cost limit controls how much I/O autovacuum can do before pausing. The default is quite conservative. For instances on SSD storage (which all Cloud SQL instances use), you can safely increase this.

```bash
# Increase the I/O budget for autovacuum
gcloud sql instances patch MY_INSTANCE \
  --database-flags=autovacuum_vacuum_cost_limit=2000,autovacuum_vacuum_cost_delay=0
```

Setting cost_delay to 0 eliminates pauses between I/O operations. This makes autovacuum more aggressive but completes faster, which is usually the right tradeoff for high-write databases.

### Step 4: Reduce Naptime

```bash
# Check for tables needing vacuum more frequently
gcloud sql instances patch MY_INSTANCE \
  --database-flags=autovacuum_naptime=15
```

This makes autovacuum check for eligible tables every 15 seconds instead of every 60 seconds.

### Applying All Flags Together

```bash
# Apply all recommended flags at once
gcloud sql instances patch MY_INSTANCE \
  --database-flags=\
autovacuum_max_workers=6,\
autovacuum_vacuum_scale_factor=0.02,\
autovacuum_analyze_scale_factor=0.01,\
autovacuum_vacuum_cost_limit=2000,\
autovacuum_vacuum_cost_delay=0,\
autovacuum_naptime=15
```

Note: Changing `autovacuum_max_workers` requires a database restart. Cloud SQL handles this automatically, but plan for a brief connection interruption.

## Per-Table Settings for Hot Tables

Some tables have much higher write rates than others. Set autovacuum parameters per table for the hottest ones.

```sql
-- Set aggressive autovacuum for a high-write table
ALTER TABLE events SET (
  autovacuum_vacuum_threshold = 1000,
  autovacuum_vacuum_scale_factor = 0.005,
  autovacuum_analyze_threshold = 500,
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_delay = 0,
  autovacuum_vacuum_cost_limit = 3000
);

-- Verify the per-table settings
SELECT
  relname,
  reloptions
FROM pg_class
WHERE relname = 'events';
```

Per-table settings override the global defaults, so you can be aggressive on busy tables without affecting the rest of the database.

## Monitoring Autovacuum Activity

### Track Vacuum Progress in Real Time

```sql
-- Show currently running autovacuum processes
SELECT
  pid,
  datname,
  relid::regclass AS table_name,
  phase,
  heap_blks_total,
  heap_blks_scanned,
  ROUND(heap_blks_scanned::numeric / NULLIF(heap_blks_total, 0) * 100, 1) AS pct_complete,
  index_vacuum_count
FROM pg_stat_progress_vacuum;
```

### Set Up Monitoring Queries

Run these periodically and alert if values exceed thresholds:

```sql
-- Monitor autovacuum effectiveness over time
SELECT
  schemaname || '.' || relname AS table_name,
  n_dead_tup,
  n_live_tup,
  ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS bloat_pct,
  last_autovacuum,
  EXTRACT(EPOCH FROM (now() - last_autovacuum)) / 3600 AS hours_since_vacuum,
  autovacuum_count
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

### Alert on Wraparound Risk

```sql
-- Check transaction ID age and alert if approaching danger zone
SELECT
  c.oid::regclass AS table_name,
  age(c.relfrozenxid) AS xid_age,
  -- PostgreSQL forces a vacuum at 200 million by default
  200000000 - age(c.relfrozenxid) AS headroom
FROM pg_class c
WHERE c.relkind = 'r'
  AND age(c.relfrozenxid) > 150000000
ORDER BY age(c.relfrozenxid) DESC;
```

If the headroom drops below 50 million, run a manual vacuum freeze:

```sql
-- Emergency: force a vacuum freeze on a table approaching wraparound
VACUUM (FREEZE, VERBOSE) events;
```

## Dealing with Table Bloat

If autovacuum has already fallen behind and tables are bloated, you need to reclaim space.

```sql
-- Check table bloat
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(quote_ident(tablename)::regclass)) AS total_size,
  pg_size_pretty(pg_relation_size(quote_ident(tablename)::regclass)) AS table_size,
  pg_size_pretty(
    pg_total_relation_size(quote_ident(tablename)::regclass) -
    pg_relation_size(quote_ident(tablename)::regclass)
  ) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(quote_ident(tablename)::regclass) DESC
LIMIT 10;
```

Regular VACUUM does not release disk space back to the OS - it only marks space for reuse. To actually shrink a table, you need `VACUUM FULL`, but that locks the table. For a less disruptive approach, use `pg_repack` (covered in a separate post).

## Wrapping Up

Autovacuum tuning is not optional for high-write PostgreSQL databases on Cloud SQL. The defaults are designed for small, low-write workloads and will not keep up with production traffic. Lower the scale factor, increase the cost limit, add more workers, and set per-table parameters for your busiest tables. Monitor dead tuple counts and transaction ID age continuously. The goal is to keep dead tuples under 5-10% of live tuples on every table and never let transaction ID age approach the wraparound threshold. Get these settings right and your database stays healthy; ignore them and you will eventually face a performance crisis or, worse, a wraparound shutdown.
