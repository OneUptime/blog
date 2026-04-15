# How to Test ClickHouse Materialized View Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Testing, SQL, Integration Test

Description: Learn how to write tests that verify ClickHouse materialized view transformation logic by inserting test data and asserting on the target table state.

---

## Why Test Materialized Views

ClickHouse materialized views run a `SELECT` query on new data as it is inserted into the source table, writing results into a target table. Bugs in the view's transformation logic are silent - inserts succeed but the target table contains wrong data. Testing ensures the view logic is correct before deploying to production.

## Test Pattern

The basic approach is:
1. Create the source table, materialized view, and target table in a test database
2. Insert controlled data into the source table
3. Assert on the expected state of the target table

## Example - Testing an Aggregating View

Source table and view:

```sql
CREATE TABLE test_db.raw_events (
  user_id    UInt64,
  event_type LowCardinality(String),
  revenue    Float64,
  event_date Date
) ENGINE = MergeTree()
ORDER BY (user_id, event_date);

CREATE TABLE test_db.daily_revenue (
  event_date Date,
  total_revenue AggregateFunction(sum, Float64)
) ENGINE = AggregatingMergeTree()
ORDER BY event_date;

CREATE MATERIALIZED VIEW test_db.mv_daily_revenue
TO test_db.daily_revenue
AS
SELECT
  event_date,
  sumState(revenue) AS total_revenue
FROM test_db.raw_events
GROUP BY event_date;
```

Python test:

```python
from datetime import date

def test_daily_revenue_mv(ch_client):
    ch_client.command('TRUNCATE TABLE test_db.raw_events')
    ch_client.command('TRUNCATE TABLE test_db.daily_revenue')

    # Insert test data
    ch_client.insert('test_db.raw_events', [
        [1, 'purchase', 100.0, '2025-06-01'],
        [2, 'purchase', 200.0, '2025-06-01'],
        [1, 'purchase',  50.0, '2025-06-02'],
    ], column_names=['user_id', 'event_type', 'revenue', 'event_date'])

    result = ch_client.query('''
        SELECT event_date, sumMerge(total_revenue) AS total
        FROM test_db.daily_revenue
        GROUP BY event_date
        ORDER BY event_date
    ''')
    rows = dict(result.result_rows)
    assert rows[date(2025, 6, 1)] == 300.0
    assert rows[date(2025, 6, 2)] == 50.0
```

## Testing Filter Logic in Views

```sql
CREATE MATERIALIZED VIEW test_db.mv_errors
TO test_db.error_events
AS
SELECT * FROM test_db.raw_events
WHERE event_type = 'error';
```

```python
def test_mv_filters_non_errors(ch_client):
    ch_client.insert('test_db.raw_events', [
        [1, 'purchase', 0.0, '2025-06-01'],
        [2, 'error',    0.0, '2025-06-01'],
    ], column_names=['user_id', 'event_type', 'revenue', 'event_date'])

    result = ch_client.query('SELECT count() FROM test_db.error_events')
    assert result.result_rows[0][0] == 1
```

## Testing PARTITION BY Behavior

Verify that the view correctly assigns rows to expected partitions. The target table must have an explicit `PARTITION BY` clause for this test to work:

```sql
CREATE TABLE test_db.daily_revenue_partitioned (
  event_date Date,
  total_revenue AggregateFunction(sum, Float64)
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY event_date;

CREATE MATERIALIZED VIEW test_db.mv_daily_revenue_partitioned
TO test_db.daily_revenue_partitioned
AS
SELECT
  event_date,
  sumState(revenue) AS total_revenue
FROM test_db.raw_events
GROUP BY event_date;
```

```python
def test_mv_partition_assignment(ch_client):
    ch_client.insert('test_db.raw_events', [
        [1, 'purchase', 10.0, '2025-01-15'],
        [2, 'purchase', 20.0, '2025-02-20'],
    ], column_names=['user_id', 'event_type', 'revenue', 'event_date'])

    result = ch_client.query('''
        SELECT partition, count() FROM system.parts
        WHERE database = 'test_db' AND table = 'daily_revenue_partitioned' AND active
        GROUP BY partition ORDER BY partition
    ''')
    partitions = [r[0] for r in result.result_rows]
    assert '202501' in partitions
    assert '202502' in partitions
```

## Summary

Test ClickHouse materialized view logic by creating the full view chain in a test database, inserting controlled test data, and asserting on the target table state. Use `TRUNCATE` before each test to ensure a clean state. Test both the transformation logic and edge cases like filter conditions and partition assignments to catch bugs that would otherwise silently corrupt your analytical tables.
