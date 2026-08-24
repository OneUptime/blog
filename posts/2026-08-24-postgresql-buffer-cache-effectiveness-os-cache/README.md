# How to Measure PostgreSQL Buffer-Cache Effectiveness Without Mistaking the OS Page Cache for Disk Reads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Buffer Cache, pg_stat_io, I/O Monitoring, Performance Tuning

Description: Interpret PostgreSQL cache-hit statistics correctly by separating shared-buffer hits, kernel page-cache reads, physical storage latency, and workload-specific access patterns.

---

The familiar PostgreSQL cache-hit ratio compares blocks found in PostgreSQL shared buffers with blocks PostgreSQL had to read. It does not compare memory with physical disk.

When PostgreSQL requests a block that is absent from shared buffers, the operating system might satisfy the read from its page cache without touching storage. PostgreSQL's documentation explicitly says its I/O statistics do not distinguish data fetched from disk from data already resident in the kernel page cache. Calling every `blks_read` a physical disk read leads to false diagnoses.

## Calculate a valid interval ratio

At database scope, the raw cumulative counters are:

```sql
SELECT datname,
       blks_hit,
       blks_read,
       stats_reset
FROM pg_stat_database
WHERE datname IS NOT NULL;
```

`blks_hit` counts blocks already found in PostgreSQL's buffer cache. `blks_read` counts blocks read through PostgreSQL's read path, including reads the kernel can serve from memory. Calculate the ratio from counter deltas over the same interval:

```text
shared_buffer_hit_ratio =
  delta(blks_hit) / (delta(blks_hit) + delta(blks_read))
```

Return no value when the denominator is zero. Reject a delta when `stats_reset` changed, a counter decreased, the server restarted, or either scrape failed. A lifetime ratio can hide a regression for days; a five- or fifteen-minute interval shows the current workload.

This is a request ratio, not a byte ratio, latency measure, or probability that a query is fast.

## Break the ratio down by relation

Database totals mix user tables, indexes, catalogs, maintenance, and different access patterns. Use `pg_statio_user_tables` to identify where buffer requests occur:

```sql
SELECT schemaname,
       relname,
       heap_blks_read,
       heap_blks_hit,
       idx_blks_read,
       idx_blks_hit,
       toast_blks_read,
       toast_blks_hit,
       tidx_blks_read,
       tidx_blks_hit
FROM pg_statio_user_tables
ORDER BY heap_blks_read + idx_blks_read DESC
LIMIT 30;
```

Again, store samples and compare deltas. A large sequential scan can intentionally stream through a buffer-access strategy rather than displacing the whole cache. A low hit ratio during a backup, analytics scan, bulk load, or vacuum is not equivalent to a low hit ratio for latency-sensitive point lookups.

For per-query attribution, `pg_stat_statements` exposes shared block hit and read counters. Its entries can reset or be evicted, and query IDs are not stable across major versions, so the same continuity rules apply.

## Add time, not just counts

Enable `track_io_timing` only after measuring overhead on the target operating system; PostgreSQL notes that repeatedly reading the clock can be expensive on some systems. When enabled, database and statement statistics include time spent waiting for reads and writes.

Current PostgreSQL releases also provide `pg_stat_io`, grouped by backend type, I/O object, and context. It reports operations, bytes, and timing where the corresponding timing setting is enabled. Use it to distinguish normal client reads from bulk-read, vacuum, checkpointer, and other contexts.

A rise in `blks_read` with near-zero read wait can be served from the OS page cache or fast storage. A smaller number of reads with high read time can be more damaging. PostgreSQL still cannot prove page-cache residency from these database counters, so correlate with operating-system block-device IOPS, bytes, latency, queue depth, filesystem cache pressure, and major page faults.

## Inspect shared-buffer residency carefully

The `pg_buffercache` extension exposes the current contents of `shared_buffers`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_buffercache;

SELECT c.oid::regclass AS relation,
       count(*) AS buffers,
       pg_size_pretty(count(*) * current_setting('block_size')::int)
         AS resident_size
FROM pg_buffercache AS b
JOIN pg_class AS c ON pg_relation_filenode(c.oid) = b.relfilenode
WHERE b.reldatabase IN (0, (SELECT oid FROM pg_database
                            WHERE datname = current_database()))
GROUP BY c.oid
ORDER BY count(*) DESC
LIMIT 30;
```

Use `pg_relation_filenode()` rather than `pg_class.relfilenode` directly because mapped system catalogs store zero in `pg_class.relfilenode`. This illustrative relation join still has limitations: tablespaces, forks, shared relations, dropped or rewritten files, and reused file nodes require careful handling. Prefer the extension's summary and usage functions when they answer the question. Buffer contents also change while the view is read; it is a diagnostic sample, not an exact historical inventory.

`pg_buffercache` sees PostgreSQL shared buffers only. It cannot tell whether an absent relation page is present in the OS page cache.

## Use query-level evidence

For a suspect statement in staging or a safely bounded production investigation:

```sql
EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)
SELECT ...;
```

`BUFFERS` separates shared hit/read/dirtied/written activity for that execution. `ANALYZE` actually runs the statement, so do not use it casually for expensive or data-changing SQL. PostgreSQL also supports `EXPLAIN (ANALYZE, BUFFERS)` I/O timing output when timing collection is enabled.

A query can have a 100 percent shared-buffer hit ratio and still be slow because it processes too many cached pages, consumes CPU, waits on a lock, spills, or sends too many rows. A low ratio can be acceptable when a well-tuned sequential scan gets high throughput from the OS cache or storage.

## Build a useful dashboard

Plot these together over the same interval:

- shared-buffer hit and read rates;
- the interval hit ratio, with request volume;
- read bytes and read wait by `pg_stat_io` context and backend type;
- storage latency, IOPS, throughput, and queue depth;
- working-set and memory pressure indicators;
- top relations and normalized queries by read delta;
- checkpoints, vacuum, bulk jobs, and deploy annotations.

Never alert on “hit ratio below 99 percent” without workload context and a minimum request volume. A sustained ratio change accompanied by higher read latency and application latency is actionable; an isolated ratio change often is not.

Version dashboards with the PostgreSQL major release. `pg_stat_io` first appeared in PostgreSQL 16 and has gained columns in later releases, while PostgreSQL 17 renamed some `pg_stat_statements` I/O timing fields. Query the actual catalog schema rather than deploying one collector SQL statement everywhere.

## Official Documentation

- [PostgreSQL cumulative I/O statistics](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL `pg_buffercache`](https://www.postgresql.org/docs/current/pgbuffercache.html)
- [PostgreSQL statistics collection settings](https://www.postgresql.org/docs/current/runtime-config-statistics.html)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [PostgreSQL buffer access strategy glossary](https://www.postgresql.org/docs/current/glossary.html#GLOSSARY-BUFFER-ACCESS-STRATEGY)

## Conclusion

Treat PostgreSQL's hit ratio as the fraction of buffer requests satisfied by `shared_buffers`, not as a disk-read ratio. Calculate it from reset-aware interval deltas, segment it by workload, add I/O time and operating-system storage evidence, and use query-level diagnostics before changing cache or memory settings.
