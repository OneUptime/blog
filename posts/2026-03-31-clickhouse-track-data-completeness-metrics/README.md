# How to Track Data Completeness Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Completeness, Data Quality, Monitoring, NULL, Metric

Description: Track data completeness in ClickHouse by measuring null rates, missing field rates, and coverage metrics to identify columns with systematic data quality issues.

---

## What Is Data Completeness?

Data completeness measures how much of your expected data is actually present. A column is incomplete if it has a high null rate, frequent default values substituted for missing data, or rows missing entirely for certain time windows.

## Measuring Null Rates Per Column

```sql
SELECT
    countIf(user_id IS NULL)    / count() AS user_id_null_rate,
    countIf(amount IS NULL)     / count() AS amount_null_rate,
    countIf(country IS NULL)    / count() AS country_null_rate,
    countIf(event_type IS NULL) / count() AS event_type_null_rate,
    count()                               AS total_rows
FROM events
WHERE ts >= today() - 7;
```

Any rate above your threshold (e.g., > 5%) should trigger a data quality alert.

## Tracking Completeness Over Time

Build a daily completeness trend table:

```sql
CREATE TABLE data_completeness_log (
    check_date       Date,
    table_name       LowCardinality(String),
    column_name      LowCardinality(String),
    total_rows       UInt64,
    non_null_rows    UInt64,
    completeness_pct Float32
) ENGINE = MergeTree()
ORDER BY (check_date, table_name, column_name);
```

Populate it with a scheduled query:

```sql
INSERT INTO data_completeness_log
SELECT
    today()        AS check_date,
    'events'       AS table_name,
    'user_id'      AS column_name,
    count()        AS total_rows,
    countIf(user_id IS NOT NULL) AS non_null_rows,
    countIf(user_id IS NOT NULL) * 100.0 / count() AS completeness_pct
FROM events
WHERE ts >= today();
```

## Detecting Default Value Abuse

When missing values become zeros or empty strings rather than NULLs:

```sql
SELECT
    count() AS total,
    countIf(user_id = 0)        / count() AS zero_user_id_rate,
    countIf(country = '')       / count() AS empty_country_rate,
    countIf(amount = 0)         / count() AS zero_amount_rate
FROM orders
WHERE order_date >= today() - 7;
```

## Field Coverage by Event Type

Some fields only apply to certain event types. Check coverage within context:

```sql
SELECT
    event_type,
    count()                             AS total,
    countIf(product_id IS NOT NULL) AS with_product,
    countIf(product_id IS NOT NULL) * 100.0 / count() AS product_coverage_pct
FROM events
WHERE ts >= today() - 7
GROUP BY event_type
ORDER BY total DESC;
```

Purchase events should have 100% product coverage; page view events 0%.

## Alerting on Completeness Drops

Query the log table for recent drops:

```sql
SELECT *
FROM (
    SELECT
        table_name,
        column_name,
        check_date,
        completeness_pct,
        lagInFrame(completeness_pct) OVER (
            PARTITION BY table_name, column_name
            ORDER BY check_date
        ) AS prev_completeness
    FROM data_completeness_log
    WHERE check_date >= today() - 7
)
WHERE completeness_pct < prev_completeness - 5  -- dropped by 5+ pct points
ORDER BY check_date DESC;
```

## Summary

Track ClickHouse data completeness by measuring null rates and zero-value rates per column, logging daily completeness percentages to a dedicated table, checking field coverage within specific event type contexts, and alerting when completeness drops significantly from the previous day. This creates a systematic, historical view of data quality across your schema.
