# How to Implement Data Validation Rules in ClickHouse Materialized Views

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Data Validation, Data Quality, ETL, Filter

Description: Implement data validation rules in ClickHouse materialized views to filter invalid rows, normalize values, and enforce business rules at ingest time.

---

## Why Validate in Materialized Views?

Materialized views in ClickHouse execute automatically on every INSERT into the source table. This makes them ideal for:
- Filtering out invalid or malformed rows
- Normalizing values (lowercase, trim whitespace)
- Enforcing business rules without modifying the insert pipeline
- Routing valid and invalid rows to separate tables for auditing

## Basic Validation Filter

Create a materialized view that only passes valid rows:

```sql
CREATE TABLE orders (
    order_id UUID,
    user_id  UInt64,
    amount   Float64,
    status   String,
    ts       DateTime
) ENGINE = MergeTree() ORDER BY ts;

-- Destination table for valid orders only
CREATE TABLE valid_orders AS orders ENGINE = MergeTree() ORDER BY ts;

CREATE MATERIALIZED VIEW validate_orders_mv TO valid_orders AS
SELECT *
FROM orders
WHERE amount > 0
  AND order_id != toUUID('00000000-0000-0000-0000-000000000000')
  AND status IN ('pending', 'paid', 'cancelled', 'refunded')
  AND ts >= '2020-01-01'
  AND ts <= now() + INTERVAL 1 DAY;
```

Only rows passing all conditions land in `valid_orders`.

## Capturing Rejected Rows

Route invalid rows to a quarantine table:

```sql
CREATE TABLE invalid_orders (
    order_id    UUID,
    user_id     UInt64,
    amount      Float64,
    status      String,
    ts          DateTime,
    rejected_at DateTime
) ENGINE = MergeTree() ORDER BY ts;

CREATE MATERIALIZED VIEW quarantine_orders_mv TO invalid_orders AS
SELECT *, now() AS rejected_at
FROM orders
WHERE amount <= 0
   OR status NOT IN ('pending', 'paid', 'cancelled', 'refunded');
```

Monitor the quarantine table for data quality issues.

## Normalizing Data at Ingest

Apply transformations in the materialized view:

```sql
CREATE TABLE normalized_events (
    event_id  UUID,
    user_id   UInt64,
    event_type LowCardinality(String),
    country   LowCardinality(String),
    ts        DateTime
) ENGINE = MergeTree() ORDER BY (event_type, ts);

CREATE MATERIALIZED VIEW normalize_events_mv TO normalized_events AS
SELECT
    event_id,
    user_id,
    lower(trim(event_type))    AS event_type,
    upper(trim(country))       AS country,
    toDateTime(ts)             AS ts
FROM raw_events
WHERE event_id IS NOT NULL
  AND user_id > 0;
```

## Type Coercion and Null Handling

Handle nulls explicitly in the view:

```sql
SELECT
    coalesce(user_id, 0)           AS user_id,
    ifNull(amount, 0.0)            AS amount,
    ifNull(country, 'UNKNOWN')     AS country
FROM raw_events;
```

## Monitoring Validation Results

Compare valid vs total inserts over time:

```sql
SELECT
    toDate(ts) AS day,
    count() AS total_raw
FROM orders
GROUP BY day;

SELECT
    toDate(ts) AS day,
    count() AS total_valid
FROM valid_orders
GROUP BY day;
```

The difference reveals the volume of rejected rows per day.

## Summary

Implement data validation in ClickHouse materialized views by filtering invalid rows with WHERE clauses, routing rejected rows to quarantine tables, normalizing values with string functions, and handling nulls explicitly. This approach enforces data quality at ingest time without changing application insert logic.
