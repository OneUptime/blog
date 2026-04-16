# How to Use Default Values for Different Data Types in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Type, Default Values, Schema Design, DDL

Description: Learn how default values work in ClickHouse for different data types, and how to set DEFAULT, MATERIALIZED, and ALIAS expressions on columns.

---

## Default Values in ClickHouse

Every ClickHouse data type has an implicit default value when no value is specified during insert. Additionally, you can specify custom default expressions using `DEFAULT`, `MATERIALIZED`, or `ALIAS`.

Understanding defaults is important because ClickHouse - unlike traditional RDBMS - does not require you to explicitly handle missing values for non-Nullable columns.

## Type System Defaults

```sql
-- Default values by type (what gets stored if you don't provide a value)
SELECT
    toInt8(0)          AS int8_default,
    toInt16(0)         AS int16_default,
    toInt32(0)         AS int32_default,
    toInt64(0)         AS int64_default,
    toFloat32(0.0)     AS float32_default,
    toFloat64(0.0)     AS float64_default,
    toString('')       AS string_default,
    toDate(0)          AS date_default,    -- 1970-01-01
    toDateTime(0)      AS datetime_default -- 1970-01-01 00:00:00
;
```

```sql
-- Demonstrate implicit defaults with partial insert
CREATE TABLE type_defaults (
    id UInt64,
    name String,
    score Float64,
    active UInt8,
    created_at DateTime
) ENGINE = MergeTree()
ORDER BY id;

-- Insert only id and name
INSERT INTO type_defaults (id, name) VALUES (1, 'Alice');

-- Other columns get type defaults
SELECT * FROM type_defaults WHERE id = 1;
-- score = 0, active = 0, created_at = 1970-01-01 00:00:00
```

## DEFAULT Expression

`DEFAULT` sets a value used when the column is omitted during insert:

```sql
CREATE TABLE orders (
    order_id UInt64,
    customer_id UInt64,
    status LowCardinality(String) DEFAULT 'pending',
    priority UInt8 DEFAULT 1,
    created_at DateTime DEFAULT now(),
    updated_at DateTime DEFAULT now(),
    discount_pct Float32 DEFAULT 0.0,
    notes String DEFAULT ''
) ENGINE = MergeTree()
ORDER BY (created_at, order_id);

-- Insert without defaults
INSERT INTO orders (order_id, customer_id) VALUES (1001, 42);

-- Verify defaults were applied
SELECT * FROM orders WHERE order_id = 1001;
-- status='pending', priority=1, created_at=<current time>, etc.
```

## DEFAULT with Expressions Referencing Other Columns

```sql
CREATE TABLE pricing (
    product_id UInt64,
    base_price Float64,
    tax_rate Float64 DEFAULT 0.08,
    -- DEFAULT can reference other columns
    price_with_tax Float64 DEFAULT base_price * (1 + tax_rate),
    discount Float64 DEFAULT 0.0,
    final_price Float64 DEFAULT price_with_tax * (1 - discount)
) ENGINE = MergeTree()
ORDER BY product_id;

INSERT INTO pricing (product_id, base_price) VALUES (1, 100.0);
SELECT product_id, base_price, price_with_tax, final_price FROM pricing;
-- price_with_tax = 108.0, final_price = 108.0
```

## MATERIALIZED Columns

`MATERIALIZED` columns are computed from other columns at insert time and stored on disk. They cannot be inserted directly:

```sql
CREATE TABLE web_requests (
    ts DateTime,
    url String,
    status_code UInt16,
    -- Materialized columns - computed and stored
    hour UInt8 MATERIALIZED toHour(ts),
    date Date MATERIALIZED toDate(ts),
    is_error UInt8 MATERIALIZED (status_code >= 400) ? 1 : 0,
    path String MATERIALIZED extract(url, '^([^?#]+)')
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (ts, url);

-- Insert - do not provide materialized columns
INSERT INTO web_requests (ts, url, status_code) VALUES
    (now(), 'https://example.com/api?key=123', 200),
    (now(), 'https://example.com/missing', 404);

-- Materialized columns are queryable
SELECT ts, path, hour, is_error FROM web_requests;
```

## ALIAS Columns

`ALIAS` columns are computed on-the-fly at query time and never stored on disk:

```sql
CREATE TABLE sales (
    sale_id UInt64,
    quantity UInt32,
    unit_price Float64,
    -- ALIAS - not stored, computed at query time
    total Float64 ALIAS quantity * unit_price,
    revenue_k Float64 ALIAS total / 1000
) ENGINE = MergeTree()
ORDER BY sale_id;

-- ALIAS columns are only available when explicitly selected
SELECT sale_id, quantity, unit_price, total, revenue_k FROM sales;

-- SELECT * does NOT include ALIAS columns
SELECT * FROM sales;  -- total and revenue_k NOT included
```

## DEFAULT vs MATERIALIZED vs ALIAS Comparison

| Feature | DEFAULT | MATERIALIZED | ALIAS |
|---------|---------|-------------|-------|
| Stored on disk | Yes | Yes | No |
| Included in SELECT * | Yes | No | No |
| Can insert value | Yes | No | No |
| Recomputed on schema change | No | Via mutation | Always |
| Performance | - | Insert overhead | Query overhead |

```sql
-- See all default expressions in a table
SHOW CREATE TABLE orders;

-- Or query system columns
SELECT name, type, default_kind, default_expression
FROM system.columns
WHERE table = 'orders'
  AND database = currentDatabase();
```

## Changing Defaults with ALTER TABLE

```sql
-- Add a DEFAULT expression to an existing column
ALTER TABLE orders
    MODIFY COLUMN status String DEFAULT 'active';

-- Change DEFAULT value
ALTER TABLE orders
    MODIFY COLUMN priority UInt8 DEFAULT 5;

-- Remove DEFAULT (revert to type default)
ALTER TABLE orders
    MODIFY COLUMN notes String;

-- Add a MATERIALIZED column
ALTER TABLE orders
    ADD COLUMN order_year UInt16 MATERIALIZED toYear(created_at);
```

## Practical Example: Event Tracking Schema

```sql
CREATE TABLE user_events (
    event_id UInt64,
    user_id UInt64,
    event_type LowCardinality(String),
    event_data String DEFAULT '{}',
    server_ts DateTime DEFAULT now(),
    client_ts DateTime DEFAULT toDateTime(0),
    -- Materialized for partitioning and filtering
    event_date Date MATERIALIZED toDate(server_ts),
    event_hour UInt8 MATERIALIZED toHour(server_ts),
    -- Alias for convenience
    is_client_time_valid UInt8 ALIAS (client_ts > toDateTime('2020-01-01 00:00:00')) ? 1 : 0
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_type, server_ts, user_id);

-- Minimal insert
INSERT INTO user_events (event_id, user_id, event_type) VALUES (1, 100, 'login');

-- Query with computed columns
SELECT
    event_id,
    event_type,
    event_date,
    event_hour,
    is_client_time_valid
FROM user_events;
```

## Summary

ClickHouse provides three types of default expressions for columns: `DEFAULT` for custom insert-time defaults, `MATERIALIZED` for computed values stored on disk, and `ALIAS` for on-the-fly computations at query time. Each type has distinct trade-offs in storage, insert performance, and query behavior. Using defaults effectively - especially MATERIALIZED columns for partition keys and derived fields - is key to building efficient ClickHouse schemas.
