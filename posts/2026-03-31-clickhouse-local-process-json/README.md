# How to Process JSON Files with clickhouse-local

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-local, JSON, NDJSON, Data Processing

Description: Learn how to process JSON and NDJSON files with clickhouse-local using SQL to parse, filter, and aggregate JSON data at the command line.

---

## JSON Processing with clickhouse-local

`clickhouse-local` supports multiple JSON formats natively: `JSONEachRow` (newline-delimited JSON), `JSONCompactEachRow` (compact row arrays), and `JSONObjectEachRow` (keyed object rows). This makes it powerful for processing API dumps, log files, and event streams.

## Reading NDJSON Files

Newline-delimited JSON (one object per line) is the most common format for log files:

```bash
clickhouse local --query "
SELECT * FROM file('events.ndjson', JSONEachRow) LIMIT 5
"
```

## Auto-Detecting JSON Schema

Let ClickHouse infer column types:

```bash
clickhouse local --query "
DESCRIBE TABLE file('events.ndjson', JSONEachRow)
"
```

## Filtering and Aggregating JSON

```bash
clickhouse local --query "
SELECT
    event_type,
    count() AS occurrences,
    uniq(user_id) AS unique_users
FROM file('events.ndjson', JSONEachRow)
WHERE event_time >= '2024-01-01'
GROUP BY event_type
ORDER BY occurrences DESC
"
```

## Extracting Nested JSON Fields

Use JSON path functions for nested structures:

```bash
clickhouse local --query "
SELECT
    JSONExtractString(raw, 'user', 'email') AS email,
    JSONExtractInt(raw, 'metadata', 'version') AS version,
    JSONExtractFloat(raw, 'payload', 'amount') AS amount
FROM file('events.ndjson', JSONEachRow)
WHERE JSONExtractString(raw, 'event') = 'purchase'
LIMIT 10
"
```

## Flattening Arrays in JSON

```bash
clickhouse local --query "
SELECT
    user_id,
    arrayJoin(JSONExtractArrayRaw(raw, 'tags')) AS tag
FROM file('users.ndjson', JSONEachRow)
LIMIT 20
"
```

## Converting JSON to CSV

```bash
clickhouse local \
  --query "SELECT user_id, email, created_at FROM file('users.ndjson', JSONEachRow)" \
  --format CSVWithNames > users.csv
```

## Processing JSON Array Files

For files that contain a top-level JSON array, `JSONEachRow` handles them automatically:

```bash
clickhouse local --query "
SELECT count(), avg(price)
FROM file('products.json', JSONEachRow)
WHERE category = 'Electronics'
"
```

## Aggregate Stats from API Response Dump

```bash
clickhouse local --query "
SELECT
    toStartOfHour(parseDateTimeBestEffort(timestamp)) AS hour,
    count() AS requests,
    countIf(status_code >= 500) AS errors,
    avg(response_time_ms) AS avg_latency
FROM file('api_logs.ndjson', JSONEachRow)
GROUP BY hour
ORDER BY hour
" --format PrettyCompact
```

## Summary

`clickhouse-local` processes JSON and NDJSON files via `JSONEachRow`, `JSONCompactEachRow`, and `JSONObjectEachRow` formats. Nested fields can be extracted with `JSONExtractString`, `JSONExtractInt`, and related functions, enabling rich analytics on raw JSON without any import step.
