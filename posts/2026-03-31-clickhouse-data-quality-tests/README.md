# How to Write Data Quality Tests for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Quality, Testing, SQL, Dbt

Description: Learn how to write SQL-based data quality tests for ClickHouse tables to catch null violations, duplicates, referential integrity failures, and range anomalies.

---

## Why Data Quality Tests for ClickHouse

ClickHouse does not enforce foreign key or uniqueness constraints, and any column wrapped in `Nullable()` can accept NULLs silently. Data quality tests are SQL assertions that run after ingestion to catch issues like unexpected nulls, duplicate primary keys, out-of-range values, and stale partitions before they affect downstream consumers.

## Not-Null Assertions

```sql
-- Fail if any critical column is null
SELECT count() AS null_user_ids
FROM events
WHERE user_id IS NULL
  AND event_date = today()
HAVING null_user_ids > 0
-- Expected: 0 rows returned
```

Wrap these in a Python test that checks for empty result sets:

```python
def assert_no_nulls(client, table, column, date):
    result = client.query(f'''
        SELECT count() AS cnt
        FROM {table}
        WHERE {column} IS NULL
          AND event_date = toDate('{date}')
        HAVING cnt > 0
    ''')
    assert len(result.result_rows) == 0, \
        f"Found NULL values in {table}.{column} for date {date}"
```

## Duplicate Primary Key Check

```sql
SELECT
  user_id,
  event_time,
  count() AS duplicates
FROM events
WHERE event_date = today()
GROUP BY user_id, event_time
HAVING duplicates > 1
LIMIT 10
```

## Value Range Assertions

```sql
-- Revenue must be non-negative
SELECT count() AS bad_revenue
FROM orders
WHERE revenue < 0
  AND order_date = today()
HAVING bad_revenue > 0
```

## Freshness Check

Detect stale partitions - data should arrive within 2 hours of the current time:

```sql
SELECT
  max(event_time) AS latest_event,
  dateDiff('minute', max(event_time), now()) AS minutes_behind
FROM events
HAVING minutes_behind > 120
```

## Row Count Anomaly Detection

Flag days with dramatically fewer rows than the trailing 7-day average:

```sql
WITH daily_counts AS (
  SELECT
    event_date,
    count() AS row_count
  FROM events
  WHERE event_date >= today() - 7
  GROUP BY event_date
),
stats AS (
  SELECT
    avg(row_count) AS avg_7d
  FROM daily_counts
  WHERE event_date < today()
)
SELECT
  d.event_date,
  d.row_count,
  s.avg_7d,
  d.row_count / s.avg_7d AS ratio
FROM daily_counts d
CROSS JOIN stats s
WHERE d.event_date = today()
  AND ratio < 0.5
```

## dbt Tests for ClickHouse

If you use dbt with the ClickHouse adapter, built-in tests map to the patterns above:

```yaml
models:
  - name: events
    columns:
      - name: user_id
        tests:
          - not_null
      - name: revenue
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
```

## Summary

Data quality tests for ClickHouse are SQL assertions that return zero rows when data is clean. Test for nulls in critical columns, duplicate primary keys, value range violations, freshness, and row count anomalies. Run them as part of your ingestion pipeline or as scheduled dbt tests to catch issues before they propagate to dashboards and ML features.
