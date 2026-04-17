# How to Build a Data Pipeline Testing Framework for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Pipeline, Testing, Data Quality, CI/CD

Description: Learn how to build a testing framework for ClickHouse data pipelines, including schema tests, row count checks, and integration test patterns.

---

## Why Test Data Pipelines

Data pipelines fail silently. A schema change upstream, a new null value, or a timestamp format change can corrupt analytics without raising an error. A testing framework catches these issues before they reach dashboards.

## Test Categories

A complete framework covers four categories:

1. Schema tests - columns exist with correct types
2. Freshness tests - data arrives within expected windows
3. Volume tests - row counts are within expected ranges
4. Value tests - nulls, ranges, and referential integrity

## Schema Tests

Validate table schema against expectations:

```sql
-- Check column exists with correct type
SELECT
    name,
    type
FROM system.columns
WHERE database = 'default'
  AND table = 'events'
  AND name = 'user_id'
  AND type = 'UInt64';
```

If no rows are returned, the schema has drifted. Wrap this in a Python test:

```python
def test_schema():
    result = client.execute(
        "SELECT name FROM system.columns "
        "WHERE database='default' AND table='events' AND name='user_id' AND type='UInt64'"
    )
    assert len(result) == 1, "Column user_id:UInt64 missing from events"
```

## Freshness Tests

Verify that data has arrived recently:

```sql
SELECT max(event_time) AS latest
FROM events
HAVING latest < now() - INTERVAL 1 HOUR;
```

If this query returns a row, the pipeline is stale.

## Volume Tests

Compare row counts against historical baselines:

```sql
SELECT
    toDate(event_time) AS day,
    count() AS rows
FROM events
WHERE event_time >= today() - 7
GROUP BY day
ORDER BY day;
```

Alert if any day falls more than 20% below the 7-day average.

## Integration Test with Docker

Spin up ClickHouse in CI using Docker:

```bash
docker run -d \
  --name clickhouse-test \
  -p 9000:9000 \
  -e CLICKHOUSE_DB=test_db \
  clickhouse/clickhouse-server:latest
```

Run migrations and load fixture data:

```bash
clickhouse-client --query "CREATE TABLE events (...) ENGINE = MergeTree() ORDER BY event_time"
clickhouse-client --query "INSERT INTO events FORMAT JSONEachRow" < fixtures/events.jsonl
```

## dbt Tests

If using dbt with ClickHouse, add schema tests in `schema.yml`:

```text
models:
  - name: events
    columns:
      - name: user_id
        tests:
          - not_null
          - unique
      - name: event_time
        tests:
          - not_null
```

Run with:

```bash
dbt test --select events
```

## Summary

A ClickHouse pipeline testing framework combines schema validation, freshness checks, volume monitoring, and value tests. Running these in CI using Docker-based integration tests catches regressions before they affect production. Schema drift and data staleness are the most common silent failures - test for both explicitly.
