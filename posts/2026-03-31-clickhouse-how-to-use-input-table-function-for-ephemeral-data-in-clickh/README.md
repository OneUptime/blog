# How to Use Input Table Function for Ephemeral Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Table Function, Data Ingestion, Performance

Description: Use ClickHouse's input() table function to transform and filter data during INSERT without creating intermediate staging tables.

---

## What Is the input() Table Function?

The `input()` table function allows you to describe the schema of data being inserted in the same INSERT statement. This lets you apply transformations, filters, and computations on the incoming data before it hits the target table - without creating a temporary staging table.

```sql
-- Standard format: INSERT INTO target_table SELECT ... FROM input(schema)
INSERT INTO events
SELECT
    toDate(raw_ts) AS event_date,
    parseDateTimeBestEffort(raw_ts) AS event_time,
    toUInt64(user_id) AS user_id,
    upper(event_type) AS event_type
FROM input('raw_ts String, user_id String, event_type String')
FORMAT CSV;
```

## Why Use input()?

- Avoids creating temporary or staging tables
- Transforms data in a single pass
- Reduces storage overhead for ETL pipelines
- Enables type conversion and filtering at ingest time
- Works with all ClickHouse input formats (CSV, JSON, Parquet, etc.)

## Basic Syntax

```sql
INSERT INTO target_table
SELECT col1, col2, ...
FROM input('col1 Type1, col2 Type2, ...')
FORMAT FormatName;
```

The schema in `input()` describes the incoming data format, not the target table.

## Example 1 - CSV Import with Transformations

```bash
# CSV file: timestamp,user_id,event,value
# 2024-01-15T10:30:00Z,1001,click,1.5
clickhouse-client --query "
INSERT INTO events
SELECT
    toDate(timestamp) AS event_date,
    parseDateTimeBestEffort(timestamp) AS event_time,
    toUInt64(user_id) AS user_id,
    event AS event_type,
    toFloat64(value) AS value
FROM input('timestamp String, user_id String, event String, value String')
FORMAT CSV
" < events.csv
```

## Example 2 - JSON Import with Filtering

```bash
# Filter out invalid rows during insert
clickhouse-client --query "
INSERT INTO orders
SELECT
    order_id,
    toUInt64(customer_id) AS customer_id,
    toDecimal64(amount, 2) AS amount,
    parseDateTimeBestEffort(created_at) AS created_at
FROM input('order_id UInt64, customer_id String, amount String, created_at String, status String')
WHERE status = 'confirmed'
FORMAT JSONEachRow
" < orders.jsonl
```

## Example 3 - Parquet Import

```bash
clickhouse-client --query "
INSERT INTO analytics.page_views
SELECT
    toDate(visit_time) AS visit_date,
    visit_time,
    user_id,
    page_url,
    duration_seconds
FROM input('visit_time DateTime, user_id UInt64, page_url String, duration_seconds UInt32')
FORMAT Parquet
" < page_views.parquet
```

## Example 4 - Computed Columns During Ingest

```sql
-- Add computed columns that are not in the source data
INSERT INTO sessions
SELECT
    session_id,
    user_id,
    toDate(start_time) AS session_date,
    start_time,
    end_time,
    dateDiff('second', start_time, end_time) AS duration_seconds,
    if(dateDiff('second', start_time, end_time) > 1800, 'long', 'short') AS session_type
FROM input('session_id String, user_id UInt64, start_time DateTime, end_time DateTime')
FORMAT TabSeparated;
```

## Example 5 - Enrichment via Dictionary Lookup

```sql
-- Enrich data with a dictionary during insert
INSERT INTO enriched_events
SELECT
    event_id,
    user_id,
    event_type,
    timestamp,
    dictGet('geo_dict', 'country', ip_address) AS country,
    dictGet('geo_dict', 'city', ip_address) AS city
FROM input('event_id UInt64, user_id UInt64, event_type String, timestamp DateTime, ip_address IPv4')
FORMAT JSONEachRow;
```

## Example 6 - Using input() with Python

```python
from clickhouse_driver import Client
import csv

client = Client(host='localhost')

# Read CSV rows
with open('data.csv') as f:
    reader = csv.DictReader(f)
    rows = [(r['ts'], r['uid'], r['event']) for r in reader]

# Insert with type conversion via input()
client.execute("""
    INSERT INTO events
    SELECT
        parseDateTimeBestEffort(ts) AS event_time,
        toUInt64(uid) AS user_id,
        lower(event) AS event_type
    FROM input('ts String, uid String, event String')
""", rows)
```

## Supported Formats with input()

```text
CSV, CSVWithNames, TSV, TabSeparated, JSONEachRow,
JSONCompactEachRow, Parquet, ORC, Arrow,
RowBinary, Native, Values, and many others
```

Check all available formats:

```sql
SELECT name FROM system.formats WHERE is_input = 1 ORDER BY name;
```

## Comparing input() vs Staging Table

```sql
-- With staging table (2 steps, extra storage):
CREATE TABLE staging (ts String, uid String, event String) ENGINE = Memory;
INSERT INTO staging FORMAT CSV ...;
INSERT INTO events SELECT parseDateTimeBestEffort(ts), toUInt64(uid), event FROM staging;
DROP TABLE staging;

-- With input() (1 step, no extra storage):
INSERT INTO events
SELECT parseDateTimeBestEffort(ts), toUInt64(uid), event
FROM input('ts String, uid String, event String')
FORMAT CSV;
```

## Summary

The `input()` table function in ClickHouse enables inline data transformation during INSERT, eliminating the need for staging tables. It accepts any ClickHouse input format, supports all SQL transformations including filtering, type casting, and dictionary enrichment, and processes data in a single pass. It is the recommended approach for ETL pipelines where the source schema differs from the target table schema.
