# How to Use EmbeddedRocksDB Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, EmbeddedRocksDB, Storage Engine, Key-Value, Performance

Description: Learn how to use the EmbeddedRocksDB table engine in ClickHouse for fast key-value lookups, low-latency point reads, and efficient upsert workloads backed by RocksDB.

---

The `EmbeddedRocksDB` table engine integrates Facebook's RocksDB storage engine directly into ClickHouse. Unlike columnar MergeTree engines optimized for analytical scans, EmbeddedRocksDB is a key-value store that excels at single-row point lookups and high-throughput upserts. It stores data on local disk using an LSM-tree structure, making it suitable for mutable reference tables, session state, and configuration data that requires fast random access.

## Creating an EmbeddedRocksDB Table

The table requires a single primary key column. All other columns are value columns stored alongside the key.

```sql
CREATE TABLE user_sessions
(
    session_id   String,
    user_id      UInt64,
    ip_address   String,
    created_at   DateTime,
    last_seen_at DateTime,
    metadata     String
)
ENGINE = EmbeddedRocksDB
PRIMARY KEY session_id;
```

The `PRIMARY KEY` must reference exactly one column and determines how data is stored and retrieved. EmbeddedRocksDB does not support multi-column primary keys.

## Inserting Data

Insert works identically to other ClickHouse engines.

```sql
INSERT INTO user_sessions VALUES
    ('sess_abc123', 1001, '192.168.1.10', now(), now(), '{"plan":"pro"}'),
    ('sess_def456', 1002, '10.0.0.5',     now(), now(), '{"plan":"free"}'),
    ('sess_ghi789', 1003, '172.16.0.1',   now(), now(), '{"plan":"pro"}');
```

## Point Lookup by Primary Key

EmbeddedRocksDB shines at single-key lookups, which are O(log N) and bypass full table scans.

```sql
-- Fast point lookup - goes directly to the RocksDB key
SELECT
    session_id,
    user_id,
    ip_address,
    last_seen_at
FROM user_sessions
WHERE session_id = 'sess_abc123';
```

```text
session_id    user_id  ip_address    last_seen_at
sess_abc123   1001     192.168.1.10  2024-06-15 10:30:00
```

## Upsert Behavior

Inserting a row with an existing primary key replaces the old row - this is the upsert semantic that makes EmbeddedRocksDB useful for mutable datasets.

```sql
-- Update last_seen_at for an existing session
INSERT INTO user_sessions VALUES
    ('sess_abc123', 1001, '192.168.1.10', '2024-06-15 10:00:00', now(), '{"plan":"pro","updated":true}');

-- Verify the row was replaced
SELECT session_id, last_seen_at, metadata
FROM user_sessions
WHERE session_id = 'sess_abc123';
```

```text
session_id    last_seen_at          metadata
sess_abc123   2024-06-15 10:35:00   {"plan":"pro","updated":true}
```

## Composite Keys via Encoded Strings

Since EmbeddedRocksDB only supports a single primary key column, multi-field keys must be encoded into one column - typically a `String` that concatenates the field values with a separator.

```sql
CREATE TABLE rate_limits
(
    rate_key   String,
    hit_count  UInt32,
    limit_val  UInt32
)
ENGINE = EmbeddedRocksDB
PRIMARY KEY rate_key;
```

```sql
INSERT INTO rate_limits VALUES
    ('42|/api/search|2024-06-15 10:00:00', 150, 1000),
    ('42|/api/export|2024-06-15 10:00:00', 3,   10),
    ('99|/api/search|2024-06-15 10:00:00', 800, 1000);

-- Look up a specific tenant+endpoint+window combination
SELECT hit_count, limit_val, hit_count >= limit_val AS throttled
FROM rate_limits
WHERE rate_key = '42|/api/export|2024-06-15 10:00:00';
```

```text
hit_count  limit_val  throttled
3          10         0
```

## Deleting Rows

Standard `ALTER TABLE DELETE` or `DELETE` statements work with EmbeddedRocksDB.

```sql
-- Delete expired sessions
DELETE FROM user_sessions
WHERE last_seen_at < now() - INTERVAL 24 HOUR;
```

## Scanning All Rows

Full table scans are supported but are slower than on columnar engines. Use them sparingly.

```sql
-- Count active sessions per plan type
SELECT
    JSONExtractString(metadata, 'plan') AS plan,
    count() AS session_count
FROM user_sessions
GROUP BY plan
ORDER BY session_count DESC;
```

## Using as a Dictionary Source

EmbeddedRocksDB tables work well as the backing store for ClickHouse dictionaries, providing fast key-value enrichment in JOIN and dictionary lookup scenarios.

```sql
-- Reference table for product catalog
CREATE TABLE product_catalog
(
    product_id   UInt64,
    product_name String,
    category     String,
    unit_price   Float64
)
ENGINE = EmbeddedRocksDB
PRIMARY KEY product_id;

INSERT INTO product_catalog VALUES
    (1, 'Widget A', 'hardware', 9.99),
    (2, 'Widget B', 'hardware', 14.99),
    (3, 'Service X', 'software', 49.99);

-- Join orders against EmbeddedRocksDB catalog
SELECT
    o.order_id,
    o.product_id,
    p.product_name,
    p.category,
    o.quantity,
    o.quantity * p.unit_price AS total_price
FROM orders AS o
LEFT JOIN product_catalog AS p ON o.product_id = p.product_id
WHERE o.order_date = today()
ORDER BY total_price DESC
LIMIT 20;
```

## Table Configuration Settings

You can tune RocksDB behavior through table settings.

```sql
CREATE TABLE config_store
(
    config_key   String,
    config_value String,
    updated_at   DateTime
)
ENGINE = EmbeddedRocksDB
PRIMARY KEY config_key
SETTINGS
    optimize_for_bulk_insert = 1,
    bulk_insert_block_size   = 65536;
```

## Checking Table Size and Row Count

EmbeddedRocksDB tables do not appear in `system.parts` (which is specific to the MergeTree family). Use `system.tables` for size estimates and `system.rocksdb` for internal RocksDB metrics.

```sql
-- Row count and approximate on-disk size
SELECT
    name,
    total_rows,
    formatReadableSize(total_bytes) AS approx_size
FROM system.tables
WHERE database = currentDatabase() AND name = 'user_sessions';
```

## Limitations

EmbeddedRocksDB does not support:
- Multi-column primary keys (only a single column)
- `ORDER BY` in table definition (only `PRIMARY KEY`)
- Aggregating functions at the storage layer
- Replication (use a distributed approach at the application level)
- Partitioning

It is local-only and not suitable for distributed deployments without an external coordination layer.

## Summary

The `EmbeddedRocksDB` engine is the right choice when you need mutable key-value semantics with fast point reads inside ClickHouse. It is ideal for reference tables, session stores, rate-limit counters, and configuration caches that require single-row upserts and sub-millisecond lookups. For analytical workloads requiring range scans and aggregations, prefer a MergeTree variant instead.
