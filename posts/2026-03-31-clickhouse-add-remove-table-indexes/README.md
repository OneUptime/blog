# How to Add and Remove Table Indexes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, Index, Skipping Index

Description: Learn how to add, materialize, and drop data skipping indexes in ClickHouse, covering minmax, set, and bloom_filter index types with practical examples.

---

ClickHouse does not use traditional B-tree indexes. Instead, it offers data skipping indexes - secondary indexes stored inside data parts that allow the query engine to skip entire granules that cannot contain matching rows. This can dramatically reduce I/O for selective queries on columns that are not part of the primary key. This post covers how to add, materialize, and remove skipping indexes using `ALTER TABLE`.

## How Skipping Indexes Work

A skipping index stores an aggregated summary (min/max range, value set, bloom filter hash, etc.) for each group of granules. When a query has a `WHERE` clause on the indexed column, ClickHouse evaluates the index to decide whether to read or skip each granule block.

The granularity of a skipping index is controlled by the `GRANULARITY` parameter - a value of 4 means the index covers 4 index granules (each granule is typically 8192 rows by default).

## Index Types

| Type | Best For | Notes |
|------|----------|-------|
| `minmax` | Range predicates on numeric/date columns | Lowest overhead |
| `set(N)` | Low-cardinality equality/IN predicates | N = max distinct values per granule; 0 = unlimited |
| `bloom_filter` | High-cardinality equality/IN predicates | Probabilistic; tunable false-positive rate |
| `tokenbf_v1` | String token search (LIKE, hasToken) | Tokenized bloom filter |
| `ngrambf_v1` | Substring search | N-gram bloom filter |

## ADD INDEX Syntax

```sql
ALTER TABLE events
    ADD INDEX idx_status status_code TYPE minmax GRANULARITY 4;
```

After adding the index definition, it exists only in the schema - existing data parts do not have index files yet.

## MATERIALIZE INDEX - Backfill Existing Parts

To build the index on existing data parts, run:

```sql
ALTER TABLE events
    MATERIALIZE INDEX idx_status;
```

This issues a background mutation. New parts written after `ADD INDEX` include the index automatically.

## DROP INDEX

```sql
ALTER TABLE events
    DROP INDEX idx_status;
```

Dropping an index removes the definition and schedules removal of index files from all existing parts via a background mutation.

## Practical Examples

### minmax Index for Date Ranges

```sql
CREATE TABLE server_logs
(
    server_id   UInt32,
    log_level   LowCardinality(String),
    message     String,
    response_ms UInt32,
    logged_at   DateTime,
    INDEX idx_response_ms response_ms TYPE minmax GRANULARITY 4,
    INDEX idx_date        logged_at   TYPE minmax GRANULARITY 4
)
ENGINE = MergeTree
ORDER BY (server_id, logged_at);
```

Queries like `WHERE response_ms > 500` or `WHERE logged_at BETWEEN ... AND ...` benefit from these indexes.

### set Index for Low-Cardinality Filtering

```sql
ALTER TABLE server_logs
    ADD INDEX idx_log_level log_level TYPE set(10) GRANULARITY 4;

ALTER TABLE server_logs
    MATERIALIZE INDEX idx_log_level;
```

The `set(10)` means: if a granule block contains more than 10 distinct values the index is not stored for that block (it cannot help skip it). Use `set(0)` for unlimited distinct values.

### bloom_filter Index for High-Cardinality Equality

```sql
ALTER TABLE server_logs
    ADD INDEX idx_message_bf message TYPE bloom_filter(0.01) GRANULARITY 1;

ALTER TABLE server_logs
    MATERIALIZE INDEX idx_message_bf;
```

The `0.01` argument is the desired false-positive rate (1%). Lower rates use more memory.

### tokenbf_v1 Index for String Search

```sql
ALTER TABLE server_logs
    ADD INDEX idx_message_token message TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1;

ALTER TABLE server_logs
    MATERIALIZE INDEX idx_message_token;
```

This accelerates queries like `WHERE hasToken(message, 'timeout')` or `WHERE message LIKE '%timeout%'`.

## Verifying Index Usage

Use `EXPLAIN` to confirm an index is being used:

```sql
EXPLAIN indexes = 1
SELECT count()
FROM server_logs
WHERE response_ms > 1000;
```

Look for a `Skip` block in the `Indexes` section listing the index `Name`, `Description`, and the `Parts` and `Granules` fractions (e.g. `Granules: 1/8`) showing how many were retained after skipping.

## Monitoring Index Materialization

```sql
SELECT mutation_id, command, is_done, parts_to_do
FROM system.mutations
WHERE table = 'server_logs'
ORDER BY create_time DESC;
```

## ON CLUSTER for Distributed Setups

```sql
ALTER TABLE server_logs ON CLUSTER '{cluster}'
    ADD INDEX idx_response_ms response_ms TYPE minmax GRANULARITY 4;

ALTER TABLE server_logs ON CLUSTER '{cluster}'
    MATERIALIZE INDEX idx_response_ms;
```

Both statements must be run with `ON CLUSTER` - `ADD INDEX` registers the definition on all nodes, and `MATERIALIZE INDEX` triggers backfill on all nodes.

## Summary

ClickHouse skipping indexes allow the query engine to bypass granules that cannot satisfy a filter, reducing I/O without the overhead of B-tree maintenance. Use `minmax` for range queries, `set` for low-cardinality equality, and `bloom_filter` or `tokenbf_v1` for high-cardinality string matching. Always run `MATERIALIZE INDEX` after `ADD INDEX` to backfill existing parts, and use `ON CLUSTER` in distributed deployments.
