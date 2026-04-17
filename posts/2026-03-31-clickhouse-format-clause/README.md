# How to Use FORMAT Clause to Control ClickHouse Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, Format, Output Format

Description: Learn how to use the FORMAT clause in ClickHouse to control query output as JSON, CSV, TabSeparated, Pretty, and other formats for pipelines and APIs.

---

The `FORMAT` clause is appended to a `SELECT` statement to control how ClickHouse serializes its output. By default, ClickHouse uses `PrettyCompact` for interactive `clickhouse-client` sessions and `TabSeparated` for non-interactive (batch) queries and the HTTP interface, but you can override this for any query. Choosing the right format matters for downstream pipelines, debugging, HTTP API integrations, and data export workflows.

## FORMAT Syntax

Add `FORMAT <format_name>` at the end of any `SELECT` statement:

```sql
SELECT user_id, event_type, event_time
FROM events
LIMIT 5
FORMAT JSONEachRow;
```

## FORMAT JSONEachRow

`JSONEachRow` outputs one JSON object per line (newline-delimited JSON, NDJSON). This is the most common format for streaming ingestion pipelines and log processors.

```sql
SELECT
    user_id,
    event_type,
    event_time,
    value
FROM events
WHERE event_time >= today()
FORMAT JSONEachRow;
```

Output:

```json
{"user_id":1001,"event_type":"purchase","event_time":"2024-03-15 10:22:01","value":49.99}
{"user_id":1002,"event_type":"view","event_time":"2024-03-15 10:22:05","value":0}
```

## FORMAT JSON

`JSON` wraps the entire result in a single JSON object with metadata including column names, types, row count, and statistics.

```sql
SELECT count() AS total, avg(value) AS avg_value
FROM events
WHERE toDate(event_time) = today()
FORMAT JSON;
```

Output:

```json
{
  "meta": [
    {"name": "total", "type": "UInt64"},
    {"name": "avg_value", "type": "Float64"}
  ],
  "data": [
    {"total": 152341, "avg_value": 24.87}
  ],
  "rows": 1,
  "statistics": {"elapsed": 0.003, "rows_read": 152341, "bytes_read": 1218728}
}
```

## FORMAT CSV

`CSV` outputs comma-separated values without a header row by default. Add `FORMAT CSVWithNames` to include column names in the first row.

```sql
-- CSV without headers
SELECT user_id, name, email
FROM users
LIMIT 100
FORMAT CSV;

-- CSV with headers (recommended for export)
SELECT user_id, name, email
FROM users
LIMIT 100
FORMAT CSVWithNames;
```

Output for `CSVWithNames`:

```text
"user_id","name","email"
1001,"Alice","alice@example.com"
1002,"Bob","bob@example.com"
```

## FORMAT TabSeparated

`TabSeparated` (TSV) is the default format for `clickhouse-client` in non-interactive (batch) mode and the HTTP interface. Use `TabSeparatedWithNames` to include headers.

```sql
SELECT
    toDate(event_time) AS day,
    count()            AS events,
    sum(value)         AS revenue
FROM sales
GROUP BY day
ORDER BY day
FORMAT TabSeparatedWithNames;
```

Output:

```text
day	events	revenue
2024-03-13	14203	71450.50
2024-03-14	15891	79632.25
2024-03-15	9102	44810.00
```

## FORMAT Pretty

`Pretty` renders output as a Unicode table - ideal for interactive exploration in the terminal. It is for human reading only, not machine parsing.

```sql
SELECT
    service,
    count()    AS error_count,
    max(error_time) AS last_error
FROM error_logs
WHERE error_time >= now() - INTERVAL 1 HOUR
GROUP BY service
ORDER BY error_count DESC
LIMIT 10
FORMAT Pretty;
```

Output:

```text
   service    | error_count |          last_error
--------------+-------------+-----------------------------
 api-gateway  |         342 | 2024-03-15 14:58:01
 auth-service |          87 | 2024-03-15 14:57:44
 db-proxy     |          12 | 2024-03-15 14:55:23
```

## FORMAT Vertical

`Vertical` displays each row as a key-value list, one field per line. Useful for inspecting wide rows with many columns.

```sql
SELECT *
FROM system.tables
WHERE database = 'default'
LIMIT 1
FORMAT Vertical;
```

Output:

```text
Row 1:
------
database:    default
name:        events
engine:      MergeTree
...
```

## FORMAT in the HTTP API

When querying via HTTP, append the format to the URL or include it in the query string:

```bash
# Format in the query string
curl "http://localhost:8123/?query=SELECT+count()+FROM+events+FORMAT+JSON"

# Format as URL parameter
curl "http://localhost:8123/?query=SELECT+user_id,event_type+FROM+events+LIMIT+10&default_format=CSVWithNames"

# POST request with format in the body
curl -X POST "http://localhost:8123/" \
  --data "SELECT user_id, event_type FROM events LIMIT 10 FORMAT JSONEachRow"
```

## FORMAT Null

`FORMAT Null` discards all output. Use it for benchmarking query execution time without the overhead of serialization:

```sql
-- Measure pure execution time, excluding serialization overhead
SELECT count(), sum(value)
FROM large_events_table
WHERE event_time >= today()
FORMAT Null;
```

## Summary

The `FORMAT` clause appended to a `SELECT` statement controls how ClickHouse serializes query results. `JSONEachRow` is best for streaming pipelines and log processors; `CSVWithNames` and `TabSeparatedWithNames` are standard for data export; `JSON` provides metadata-rich structured output for API responses; `Pretty` and `Vertical` are for interactive debugging. In the HTTP API, include the format directly in the query string or as a URL parameter. Use `FORMAT Null` to benchmark query execution time without serialization overhead.
