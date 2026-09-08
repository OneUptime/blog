# How to Use DuckDB for Embedded Analytics Without Using It as OLTP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DuckDB, Analytics, OLAP, Embedded Database, Parquet

Description: Embed DuckDB behind bounded analytical jobs while keeping high-concurrency transactional writes in an OLTP system.

---

DuckDB is an in-process analytical database. It is optimized for larger, less frequent queries rather than large numbers of tiny concurrent requests. That makes it excellent for reports, feature generation, data exploration, and direct Parquet analysis, but a poor default for the mutable request path of a multi-worker web service.

## Draw a system-of-record boundary

Keep user-facing transactions in a system designed for the required write concurrency and availability, such as PostgreSQL or a single-host SQLite service that still fits its workload. Publish immutable analytical inputs to DuckDB through one of these patterns:

- periodic Parquet snapshots;
- append-only event files with a high-water mark;
- a consistent database export;
- change data captured into versioned batches;
- a prebuilt DuckDB artifact published by one writer.

Each batch needs an identifier, source interval, schema version, row counts, and completion marker. DuckDB readers should consume only completed batches. This prevents a report from mixing half-published data with a prior snapshot.

Do not synchronously dual-write the OLTP database and DuckDB from a request unless the application can reconcile a commit that succeeds in only one system. An asynchronous, idempotent projection is easier to recover.

## Query files in place when possible

DuckDB can read Parquet directly, and its Parquet reader applies projection and filter pushdown. Select only required columns and filter early:

```sql
SELECT
    date_trunc('day', occurred_at) AS day,
    service,
    count(*) AS error_count
FROM read_parquet('/srv/analytics/events/date=*/part-*.parquet')
WHERE occurred_at >= TIMESTAMP '2026-09-01 00:00:00'
  AND status = 'error'
GROUP BY day, service
ORDER BY day, service;
```

Partition files by dimensions that commonly restrict scans, such as date, but avoid creating huge numbers of tiny files. Use `EXPLAIN` to confirm the filter reaches the scan and `EXPLAIN ANALYZE` to profile real execution.

Materialize a DuckDB table only when repeated access, local compression, or a more stable serving artifact justifies another copy. Make the refresh replace a versioned artifact rather than mutating the file under independent reader processes.

## Batch ingestion instead of issuing row-sized queries

For data loaded into DuckDB, use `COPY`, create-table-as-select, bulk inserts, or the client API's Appender. Avoid one prepared `INSERT` per network request. The ingestion owner should run in one process and commit bounded batches. The example assumes `event_fact` matches the Parquet column order and types, and `loaded_batch` has a batch identifier primary key followed by a timestamp column. Keep each batch identifier tied to immutable input and skip identifiers already recorded in `loaded_batch`.

```sql
BEGIN;
INSERT INTO event_fact
SELECT *
FROM read_parquet('/srv/incoming/batch-0042/*.parquet');
-- Validate row counts and uniqueness here; roll back if validation fails.
INSERT INTO loaded_batch VALUES ('batch-0042', current_timestamp);
COMMIT;
```

Validate row counts and uniqueness before marking the batch visible. If ingestion fails, roll back any active transaction and retry the same batch identifier. If the commit outcome is uncertain, check `loaded_batch` before retrying; the primary key prevents a replay from committing duplicate data.

## Bound analytical resource use

DuckDB uses parallel execution and can spill larger-than-memory operations to disk, but joins, grouping, sorting, window functions, and some aggregate states can still consume substantial memory. Give the embedded workload an explicit budget:

```sql
SET memory_limit = '4GB';
SET threads = 4;
SET temp_directory = '/var/lib/myapp/duckdb-tmp';
SET max_temp_directory_size = '40GB';
```

Choose values from the host or container limit after reserving memory for the application, client libraries, result materialization, and concurrent jobs. Put temporary spill data on fast local storage with monitored free space. A memory limit is not a complete process-RSS cap, so enforce an operating-system or container limit as a final boundary.

Avoid returning an unbounded result into application memory. Aggregate in SQL, stream or fetch results in batches where the binding supports it, and impose business-level row and time limits.

## Control concurrency at the service boundary

Within one process, DuckDB supports multiple connections and optimistic concurrent writes. Updates to the same rows can conflict and should be retried only when the transaction is idempotent. When processes open a native DuckDB file directly, multiple processes can read in read-only mode only when no process holds it open in read-write mode.

Put analytical requests through a bounded worker pool. Limit both query count and the sum of their memory expectations. Queue or reject excess work instead of allowing every web worker to start a full scan. Record queue wait, query duration, peak memory, spill bytes, input bytes, and output rows.

If independent replicas need the same data, publish immutable read-only DuckDB files or Parquet datasets and let each replica open a local copy. Do not let autoscaled workers compete to open one native file for writes.

## Keep operational and analytical SLOs separate

An expensive report should not consume the memory, CPU, or I/O needed for request transactions. Run DuckDB in a separate process, container, or node pool when resource isolation matters. Give jobs deadlines and cancellation paths, and validate that cancellation releases resources.

Design freshness as an explicit analytical SLO. A five-minute snapshot lag can be safer and more predictable than coupling every OLTP commit to an analytical file.

## Conclusion

Use DuckDB as an embedded analytical execution engine, not as an accidental multi-worker transaction server. Feed it versioned snapshots or idempotent batches, exploit Parquet pushdown, batch writes, cap memory and spill, and admit only a bounded number of queries. Keep the OLTP system authoritative and make analytical freshness a visible contract.

## Official Documentation

- [DuckDB workload tuning](https://duckdb.org/docs/current/guides/performance/how_to_tune_workloads.html)
- [DuckDB Parquet support](https://duckdb.org/docs/current/data/parquet/overview.html)
- [DuckDB concurrency](https://duckdb.org/docs/current/connect/concurrency.html)
- [DuckDB configuration](https://duckdb.org/docs/current/configuration/overview.html)
