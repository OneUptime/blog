# How to Use toYYYYMM() and toYYYYMMDD() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Partition Key, Analytics, Storage Optimization

Description: Learn how toYYYYMM() and toYYYYMMDD() convert dates to compact integer representations useful for partition keys, range filtering, and storage efficiency.

---

ClickHouse provides `toYYYYMM()` and `toYYYYMMDD()` as lightweight functions that convert a date or datetime into a compact unsigned integer. `toYYYYMM(dt)` returns a `UInt32` of the form `YYYYMM` (for example, `202401` for January 2024). `toYYYYMMDD(dt)` returns a `UInt32` of the form `YYYYMMDD` (for example, `20240115`). These integers are naturally sortable, human-readable at a glance, and efficient to store and filter compared to formatted date strings. They are especially popular as partition key expressions.

## Basic Usage

```sql
-- Observe the return values for a sample date
SELECT
    toDate('2024-06-15') AS d,
    toYYYYMM(d) AS yyyymm,
    toYYYYMMDD(d) AS yyyymmdd;
```

```text
d           yyyymm  yyyymmdd
2024-06-15  202406  20240615
```

Both functions accept `Date`, `Date32`, `DateTime`, and `DateTime64` arguments.

## Using toYYYYMM as a Partition Key

Monthly partitioning is one of the most common patterns in ClickHouse. `toYYYYMM` maps directly to a partition expression that creates one partition per calendar month.

```sql
CREATE TABLE access_logs
(
    log_id      UInt64,
    user_id     UInt64,
    request_url String,
    status_code UInt16,
    logged_at   DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(logged_at)
ORDER BY (logged_at, user_id);
```

Each partition covers exactly one month. Dropping a month of data becomes a single `ALTER TABLE DROP PARTITION 202406` command.

## Dropping a Monthly Partition

```sql
-- Remove all data from June 2024
ALTER TABLE access_logs DROP PARTITION 202406;

-- List current partitions to verify
SELECT
    partition,
    rows,
    formatReadableSize(bytes_on_disk) AS size_on_disk
FROM system.parts
WHERE table = 'access_logs' AND active = 1
ORDER BY partition;
```

## Range Filtering With toYYYYMM

Because `toYYYYMM` returns an integer, you can use standard comparison operators for range queries. ClickHouse prunes partitions when the filter matches the partition key expression.

```sql
-- Query data for Q1 2024 (January through March)
SELECT
    toYYYYMM(logged_at) AS month,
    count() AS requests,
    countIf(status_code >= 500) AS server_errors
FROM access_logs
WHERE toYYYYMM(logged_at) BETWEEN 202401 AND 202403
GROUP BY month
ORDER BY month;
```

## Using toYYYYMMDD for Daily Partition Keys

If your data volume is high enough to warrant daily partitions, `toYYYYMMDD` is the right choice.

```sql
CREATE TABLE iot_readings
(
    device_id  UInt32,
    metric     String,
    value      Float64,
    recorded_at DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(recorded_at)
ORDER BY (device_id, recorded_at);
```

## Filtering by Date Range With toYYYYMMDD

```sql
-- Retrieve readings for a specific week
SELECT
    device_id,
    metric,
    avg(value) AS avg_value
FROM iot_readings
WHERE toYYYYMMDD(recorded_at) BETWEEN 20240610 AND 20240616
GROUP BY device_id, metric
ORDER BY device_id, metric;
```

## Compact Date Storage in Summary Tables

For pre-aggregated summary tables, storing the date as a `UInt32` column using `toYYYYMM` or `toYYYYMMDD` provides a sortable, human-readable key that doubles as a natural grouping dimension. Note that `UInt32` (4 bytes) uses more storage than a `Date` column (2 bytes), but the integer representation is convenient when the column serves as an aggregation key rather than a precise date.

```sql
-- Populate a monthly summary table using toYYYYMM as the key column
INSERT INTO monthly_revenue_summary
SELECT
    toYYYYMM(sale_date) AS month_key,
    product_id,
    sum(amount) AS total_revenue,
    count() AS transaction_count
FROM sales
GROUP BY month_key, product_id;
```

```sql
-- Query the summary for a specific month
SELECT *
FROM monthly_revenue_summary
WHERE month_key = 202403
ORDER BY total_revenue DESC
LIMIT 20;
```

## Converting Back to a Date

When you need to display the integer month key as a readable date, use string formatting or reconstruct a `Date` from the integer.

```sql
-- Convert a YYYYMM integer back to the first day of that month
SELECT
    month_key,
    toDate(
        concat(
            toString(intDiv(month_key, 100)),
            '-',
            lpad(toString(month_key MOD 100), 2, '0'),
            '-01'
        )
    ) AS first_of_month
FROM monthly_revenue_summary
LIMIT 5;
```

## Summary

`toYYYYMM()` and `toYYYYMMDD()` produce compact, sortable integer representations of dates. Their primary use cases are partition key expressions for monthly or daily partitioning, range filters that benefit from partition pruning, and compact date keys in summary tables. Because these integers sort correctly in ascending order, they work naturally in `ORDER BY` and `BETWEEN` filters without any string conversion overhead.
