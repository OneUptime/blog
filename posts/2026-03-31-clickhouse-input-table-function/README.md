# How to Use input() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Table Function, SQL, Database, ETL, Ingestion

Description: Learn how to use the input() table function in ClickHouse to stream and transform data during INSERT operations, applying column expressions and type conversions on the fly.

---

The `input()` table function in ClickHouse is a special-purpose function used exclusively inside `INSERT INTO ... SELECT` statements. It allows you to describe the schema of the incoming data stream and transform it during the insert operation - applying expressions, type conversions, and computations column by column.

## What Is the input() Table Function?

When you pipe data into ClickHouse via the HTTP interface or the `clickhouse-client`, the data arrives in a raw format. The `input()` function lets you declare what that raw data looks like and then transform it inline before it lands in the target table.

The key difference from a standard `INSERT ... FORMAT` statement is that `input()` allows you to run arbitrary SQL expressions on each incoming column as part of the insert pipeline.

```sql
INSERT INTO target_table
SELECT id, upper(name), toDate(event_ts)
FROM input('id UInt32, name String, event_ts String')
FORMAT CSV;
```

## Basic Syntax

```sql
INSERT INTO <table>
SELECT <expressions>
FROM input('<col_name> <type> [, ...]')
FORMAT <format>;
```

The `FORMAT` clause tells ClickHouse what format the piped data is in. The `input()` function's schema argument describes the structure of that incoming data.

## Why Use input() Instead of Direct INSERT?

| Approach | Transformation | Schema Flexibility |
|---|---|---|
| `INSERT INTO table FORMAT CSV` | None (direct mapping) | Must match table schema exactly |
| `INSERT INTO table SELECT ... FROM input(...)` | Any SQL expression | Input schema can differ from table schema |

`input()` is essential when:
- The incoming data has different column names or types than the target table.
- You need to compute derived columns (hashes, dates, URL parsing) during insert.
- You want to filter rows based on conditions on the incoming data.

## Example: Type Conversion During Insert

Suppose your CSV data stores timestamps as strings, but your table expects `DateTime`:

```sql
-- Target table
CREATE TABLE page_views
(
    view_id   UInt64,
    url       String,
    user_id   UInt32,
    viewed_at DateTime
)
ENGINE = MergeTree()
ORDER BY viewed_at;

-- Insert with inline conversion
INSERT INTO page_views
SELECT
    view_id,
    url,
    user_id,
    parseDateTimeBestEffort(viewed_at_str) AS viewed_at
FROM input('view_id UInt64, url String, user_id UInt32, viewed_at_str String')
FORMAT CSVWithNames;
```

When you run this via `clickhouse-client`, pipe your CSV through stdin:

```bash
clickhouse-client --query "
INSERT INTO page_views
SELECT
    view_id,
    url,
    user_id,
    parseDateTimeBestEffort(viewed_at_str)
FROM input('view_id UInt64, url String, user_id UInt32, viewed_at_str String')
FORMAT CSVWithNames" < page_views.csv
```

## Example: Computing Derived Columns

Add a computed column that does not exist in the source data:

```sql
INSERT INTO events
SELECT
    event_id,
    lower(event_type) AS event_type,
    cityHash64(user_agent) AS user_agent_hash,
    toStartOfHour(parseDateTimeBestEffort(ts_str)) AS hour_bucket
FROM input('event_id UInt64, event_type String, user_agent String, ts_str String')
FORMAT TSV;
```

## Example: Filtering During Insert

Drop rows that do not meet a condition before they reach the table:

```sql
INSERT INTO error_logs
SELECT
    ts,
    level,
    message
FROM input('ts DateTime, level String, message String')
WHERE level IN ('ERROR', 'CRITICAL')
FORMAT JSONEachRow;
```

## Example: Inserting Data from a File via input()

Using the `clickhouse-client` with input redirection:

```bash
clickhouse-client \
  --query "INSERT INTO sales SELECT order_id, product, toFloat64(amount_str) AS amount, toDate(date_str) AS sale_date FROM input('order_id UInt64, product String, amount_str String, date_str String') FORMAT CSVWithNames" \
  < /path/to/sales_export.csv
```

## Example: JSON Input with Computed Fields

```bash
echo '{"user_id": 42, "raw_score": "95.5", "timestamp": "2026-03-01T10:00:00Z"}' | \
clickhouse-client --query "
INSERT INTO user_scores
SELECT
    user_id,
    toFloat32(raw_score) AS score,
    parseDateTimeBestEffort(timestamp) AS recorded_at
FROM input('user_id UInt32, raw_score String, timestamp String')
FORMAT JSONEachRow"
```

## Using input() with HTTP Interface

The same approach works over HTTP. Send the query as a URL parameter and the data as the POST body:

```bash
curl -X POST \
  'http://localhost:8123/?query=INSERT+INTO+page_views+SELECT+view_id%2Curl%2Cuser_id%2CparseDateTimeBestEffort%28viewed_at_str%29+FROM+input%28%27view_id+UInt64%2C+url+String%2C+user_id+UInt32%2C+viewed_at_str+String%27%29+FORMAT+CSVWithNames' \
  --data-binary @page_views.csv
```

## Multi-Column Transformation Example

A more complex real-world scenario: parsing a raw web server log format into a structured table.

```sql
-- Target table
CREATE TABLE web_logs
(
    ts          DateTime,
    ip          String,
    method      LowCardinality(String),
    path        String,
    status_code UInt16,
    bytes_sent  UInt32,
    duration_ms UInt32,
    date        Date MATERIALIZED toDate(ts)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, ip);

-- Insert with transformations
INSERT INTO web_logs
SELECT
    parseDateTimeBestEffort(raw_ts)    AS ts,
    raw_ip                             AS ip,
    upper(raw_method)                  AS method,
    raw_path                           AS path,
    toUInt16(raw_status)               AS status_code,
    toUInt32(raw_bytes)                AS bytes_sent,
    toUInt32(raw_duration_ms)          AS duration_ms
FROM input('raw_ts String, raw_ip String, raw_method String, raw_path String, raw_status String, raw_bytes String, raw_duration_ms String')
FORMAT TSV;
```

## Important Constraints

- `input()` can only be used inside an `INSERT SELECT` query, and it can appear only once. It cannot be used in a standalone `SELECT` query.
- The incoming data stream is read only once and is not buffered, so it cannot be rescanned within the same query.
- Aside from those restrictions, `input()` otherwise behaves like an ordinary table function.
- The `FORMAT` clause is mandatory and must be specified at the end of the query.

## Summary

The `input()` table function gives you a powerful transformation layer that sits right at the ingestion boundary. Key points:

- Declare the incoming data schema independently of the target table schema.
- Apply SQL expressions to transform, cast, compute, and filter data during insert.
- Pipe data from files or external processes via `clickhouse-client` or the HTTP interface.
- Use it whenever the source and target schemas differ or when you need computed columns that are not in the source data.
