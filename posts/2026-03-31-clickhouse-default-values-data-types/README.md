# How to Use Default Values for Data Types in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Default Values

Description: Learn how ClickHouse handles default values for columns using DEFAULT, MATERIALIZED, and ALIAS expressions with practical examples.

---

Every column in a ClickHouse table has a default value behavior. When you insert a row without specifying a column, ClickHouse either uses the type's built-in zero-value, evaluates a user-defined `DEFAULT` expression, computes a `MATERIALIZED` value, or resolves an `ALIAS` at query time. Understanding these four behaviors lets you design tables that are both compact and self-consistent without extra application logic.

## Type Default Values

If a column has no explicit default clause and no value is provided during INSERT, ClickHouse writes the type's zero-value:

| Type | Default value |
|------|--------------|
| Int8 - Int256, UInt8 - UInt256 | 0 |
| Float32, Float64 | 0.0 |
| String | '' (empty string) |
| FixedString(N) | N null bytes |
| Date, Date32 | 1970-01-01 |
| DateTime, DateTime64 | 1970-01-01 00:00:00 |
| UUID | 00000000-0000-0000-0000-000000000000 |
| Array(T) | [] (empty array) |
| Nullable(T) | NULL |

```sql
CREATE TABLE events (
    id       UInt64,
    name     String,
    score    Float32,
    tags     Array(String)
) ENGINE = MergeTree()
ORDER BY id;

INSERT INTO events (id) VALUES (1);

SELECT * FROM events WHERE id = 1;
-- id=1, name='', score=0, tags=[]
```

## DEFAULT Expressions

Use the `DEFAULT` keyword to set a custom default that is evaluated at insert time when the column value is omitted:

```sql
CREATE TABLE orders (
    order_id   UInt64,
    status     String    DEFAULT 'pending',
    created_at DateTime  DEFAULT now(),
    priority   UInt8     DEFAULT 1
) ENGINE = MergeTree()
ORDER BY order_id;

INSERT INTO orders (order_id) VALUES (42);

SELECT order_id, status, priority FROM orders WHERE order_id = 42;
-- order_id=42, status='pending', priority=1
```

The expression is evaluated once per inserted row. You can reference other columns in the same row:

```sql
CREATE TABLE products (
    id           UInt64,
    base_price   Float64,
    sale_price   Float64  DEFAULT base_price * 0.9
) ENGINE = MergeTree()
ORDER BY id;
```

When `sale_price` is omitted, it is computed from `base_price` at insert time and stored.

## MATERIALIZED Expressions

A `MATERIALIZED` column is always computed from an expression and is never provided directly during INSERT. It is stored on disk like a regular column, making it fast to read.

```sql
CREATE TABLE page_views (
    url        String,
    visited_at DateTime,
    visit_date Date       MATERIALIZED toDate(visited_at),
    visit_hour UInt8      MATERIALIZED toHour(visited_at)
) ENGINE = MergeTree()
ORDER BY (url, visited_at);

INSERT INTO page_views (url, visited_at)
VALUES ('/', '2024-06-15 14:32:00');

SELECT url, visit_date, visit_hour FROM page_views;
-- url='/', visit_date=2024-06-15, visit_hour=14
```

Attempting to insert a value into a `MATERIALIZED` column raises an error. Materialized columns are excluded from `SELECT *` by default; to include them, list them explicitly or enable the setting `asterisk_include_materialized_columns = 1`.

## ALIAS Expressions

An `ALIAS` column is not stored on disk. It is computed at query time each time the column is selected. This makes it useful for derived views without storage overhead.

```sql
CREATE TABLE metrics (
    value_ms   UInt64,
    value_sec  Float64  ALIAS value_ms / 1000.0,
    value_min  Float64  ALIAS value_ms / 60000.0
) ENGINE = MergeTree()
ORDER BY value_ms;

INSERT INTO metrics (value_ms) VALUES (90000);

SELECT value_ms, value_sec, value_min FROM metrics;
-- value_ms=90000, value_sec=90, value_min=1.5
```

Because `ALIAS` columns are not stored, they cannot be used in ORDER BY or PRIMARY KEY. They also do not appear in `SELECT *` by default.

## Comparison of DEFAULT, MATERIALIZED, and ALIAS

```sql
CREATE TABLE demo (
    ts        DateTime,

    -- Stored, computed at insert if omitted
    day       Date      DEFAULT toDate(ts),

    -- Always stored, always computed from expression, never inserted directly
    hour      UInt8     MATERIALIZED toHour(ts),

    -- Never stored, computed at query time when explicitly selected
    minute    UInt8     ALIAS toMinute(ts)
) ENGINE = MergeTree()
ORDER BY ts;
```

| Behavior | DEFAULT | MATERIALIZED | ALIAS |
|----------|---------|--------------|-------|
| Stored on disk | Yes | Yes | No |
| Can be inserted | Yes (if omitted, expression runs) | No | No |
| Appears in SELECT * | Yes | No | No |
| Computed at | Insert time | Insert time | Query time |

## Altering Default Expressions

You can change a column's default expression on an existing table without rewriting data:

```sql
ALTER TABLE orders MODIFY COLUMN status String DEFAULT 'new';
```

Existing rows keep their stored values. Only future inserts that omit `status` will use the new default.

## Summary

ClickHouse columns default to their type's zero-value when no value is provided. You can override this with `DEFAULT` for stored computed defaults, `MATERIALIZED` for columns always derived from an expression and stored, and `ALIAS` for on-the-fly computed columns with no storage cost. Choosing the right mechanism lets you keep insert logic simple while maintaining derived data consistency.
