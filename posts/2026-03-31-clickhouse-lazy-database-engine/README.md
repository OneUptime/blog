# How to Use Lazy Database Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Lazy Database Engine, Log Engine, Memory Optimization, Infrequent Access

Description: Learn when and how to use the Lazy database engine in ClickHouse for databases with many infrequently accessed Log-family tables.

---

**Note:** The Lazy database engine was removed from ClickHouse in version 25.1 (January 2026). It has been replaced by the `lazy_load_tables` setting available on the Atomic database engine (e.g., `CREATE DATABASE my_db ENGINE = Atomic SETTINGS lazy_load_tables = 1`). The information below applies to older ClickHouse versions only.

The Lazy database engine is a specialized ClickHouse database engine designed for scenarios where you have many small tables that are rarely queried. Instead of keeping table metadata and data structures loaded in memory at all times, Lazy unloads tables from RAM after a configurable period of inactivity and reloads them on demand. This is particularly useful for multi-tenant setups or archival databases.

## When to Use Lazy

Use the Lazy engine when:
- You have hundreds or thousands of small tables
- Tables use the Log, TinyLog, or StripeLog engines
- Most tables are infrequently accessed
- You want to minimize memory usage for inactive tables

Note: Lazy only supports Log-family engines (Log, TinyLog, StripeLog). It does NOT support MergeTree engines.

## Creating a Lazy Database

```sql
CREATE DATABASE archive_logs
ENGINE = Lazy(3600);
```

The parameter (required) defines the expiration time in seconds — how long a table stays in memory after its last access. After 3600 seconds (1 hour) of inactivity, the table is unloaded from RAM.

## Creating Tables Inside a Lazy Database

Only Log-family tables are supported:

```sql
-- TinyLog: simplest, no indexing, good for very small datasets
CREATE TABLE archive_logs.tenant_1234_jan2023 (
    ts DateTime,
    level String,
    message String
) ENGINE = TinyLog;

-- Log: supports parallel reads, better for slightly larger datasets
CREATE TABLE archive_logs.tenant_5678_jan2023 (
    ts DateTime,
    level String,
    message String
) ENGINE = Log;
```

## Inserting and Querying

Usage is identical to regular tables:

```sql
INSERT INTO archive_logs.tenant_1234_jan2023 VALUES
(now(), 'ERROR', 'Connection timeout'),
(now(), 'INFO', 'Request processed');

SELECT *
FROM archive_logs.tenant_1234_jan2023
WHERE level = 'ERROR'
ORDER BY ts DESC;
```

When the table has been inactive past the expiration time, ClickHouse reloads it transparently on the next access. The reload adds a small delay (usually milliseconds) before the query executes.

## Checking Memory Usage

You can observe that inactive Lazy tables consume no memory:

```sql
SELECT
    database,
    table,
    total_bytes
FROM system.tables
WHERE database = 'archive_logs'
ORDER BY total_bytes DESC;
```

## Multi-Tenant Log Archival Pattern

A common use case is per-tenant log tables:

```sql
-- Create one table per tenant per month
CREATE TABLE archive_logs.tenant_100_2024_01 (
    ts DateTime,
    event String,
    payload String
) ENGINE = TinyLog;

-- Only the actively queried tenant tables stay in memory
```

## Limitations

- Does not support MergeTree, Distributed, or other non-Log engines.
- Not suitable for high-throughput or frequently accessed data.
- Table reload on first access after expiration adds latency.
- No replication support - Lazy tables are local only.

## Summary

The Lazy database engine is a memory-efficient solution for ClickHouse instances hosting many small, infrequently accessed Log tables. By automatically unloading inactive tables from RAM and reloading them on demand, it allows a single ClickHouse server to manage thousands of tenant tables without exhausting memory. It is best suited for archival, multi-tenant log storage, and low-frequency analytical workloads.
