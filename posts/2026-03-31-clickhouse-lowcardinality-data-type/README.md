# How to Use LowCardinality Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, LowCardinality, Compression, Performance

Description: Learn how LowCardinality(T) uses dictionary encoding to compress columns with few distinct values and improve query performance.

---

`LowCardinality(T)` is a wrapper type that applies dictionary encoding to any column with a low number of distinct values. Instead of storing the raw value for every row, ClickHouse stores a compact dictionary and a small integer index per row. This can dramatically reduce storage size and speed up filtering and GROUP BY operations on string columns.

## What Is LowCardinality

`LowCardinality(T)` wraps supported data types including `String`, `FixedString`, `Date`, `DateTime`, and numeric types. ClickHouse builds a per-part dictionary of distinct values and replaces each value with a numeric index. The dictionary lookup is transparent to SQL - you write queries as if the column holds the original type.

```sql
CREATE TABLE web_requests (
    request_id   UInt64,
    method       LowCardinality(String),
    status_code  LowCardinality(String),
    country_code LowCardinality(FixedString(2)),
    path         String
) ENGINE = MergeTree()
ORDER BY request_id;
```

## When to Use LowCardinality

Use `LowCardinality` when a column has fewer than ~10,000 distinct values relative to total row count. Common candidates include HTTP methods, status codes, country codes, log levels, and category labels.

```sql
-- Check distinct value count before deciding
SELECT
    count() AS total_rows,
    uniq(status_code) AS distinct_status_codes,
    uniq(country_code) AS distinct_countries
FROM web_requests;
```

Avoid `LowCardinality` on high-cardinality columns like user IDs, UUIDs, or free-text fields. The dictionary overhead outweighs benefits when nearly every value is unique.

## Compression Benefits

Dictionary encoding reduces storage substantially for string columns with repeated values.

```sql
-- Compare sizes with and without LowCardinality
CREATE TABLE test_low (val LowCardinality(String))
ENGINE = MergeTree() ORDER BY val;

CREATE TABLE test_regular (val String)
ENGINE = MergeTree() ORDER BY val;

INSERT INTO test_low   SELECT toString(number % 100) FROM numbers(10000000);
INSERT INTO test_regular SELECT toString(number % 100) FROM numbers(10000000);

SELECT
    'LowCardinality' AS type,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed
FROM system.parts
WHERE table = 'test_low' AND active

UNION ALL

SELECT
    'Regular',
    formatReadableSize(sum(data_compressed_bytes)),
    formatReadableSize(sum(data_uncompressed_bytes))
FROM system.parts
WHERE table = 'test_regular' AND active;
```

## Performance Impact on Queries

ClickHouse can execute GROUP BY and filter operations directly on dictionary indexes without decoding each value, which speeds up aggregations significantly.

```sql
-- Aggregation benefits from dictionary-level operations
SELECT
    method,
    status_code,
    count() AS requests,
    countIf(status_code = '500') AS errors
FROM web_requests
GROUP BY method, status_code
ORDER BY requests DESC;
```

## LowCardinality with Other Types

`LowCardinality` works with most scalar types, not just strings.

```sql
CREATE TABLE sensor_readings (
    sensor_id  UInt32,
    location   LowCardinality(String),
    unit       LowCardinality(FixedString(4)),  -- 'degC', 'degF', 'Pa'
    value      Float64,
    recorded_at DateTime
) ENGINE = MergeTree()
ORDER BY (sensor_id, recorded_at);

-- Insert sample data
INSERT INTO sensor_readings VALUES
    (1, 'warehouse-a', 'degC', 22.5, '2026-01-01 08:00:00'),
    (2, 'warehouse-b', 'degC', 21.0, '2026-01-01 08:00:00'),
    (3, 'office',      'degF', 71.6, '2026-01-01 08:00:00');
```

## Nullable and LowCardinality

You can combine `LowCardinality` with `Nullable`, but the order matters - `LowCardinality(Nullable(String))` is valid. Be aware that adding `Nullable` carries its own performance overhead.

```sql
CREATE TABLE products (
    product_id UInt64,
    category   LowCardinality(Nullable(String)),
    brand      LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY product_id;

INSERT INTO products VALUES (1, 'Electronics', 'Acme'), (2, NULL, 'Generic');

SELECT product_id, isNull(category) AS has_no_category FROM products;
```

## Summary

`LowCardinality(T)` is one of the easiest optimizations in ClickHouse - wrapping a low-cardinality string column can cut storage by 3x-10x and speed up GROUP BY queries significantly. Apply it to columns like log level, status code, country code, or any enum-like field with fewer than ~10,000 distinct values. Avoid it on high-cardinality columns where the dictionary overhead provides no benefit.
