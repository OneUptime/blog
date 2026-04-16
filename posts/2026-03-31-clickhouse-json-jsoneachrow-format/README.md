# How to Use JSON and JSONEachRow Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JSON Format, JSONEachRow Format, Data Import, Data Export

Description: Learn how to use JSON and JSONEachRow formats in ClickHouse for importing and exporting data as JSON objects with flexible schema handling.

---

ClickHouse supports multiple JSON formats. The two most commonly used are JSON (which wraps results in a JSON object with metadata) and JSONEachRow (also called NDJSON - one JSON object per line). Understanding when to use each is essential for efficient data pipelines and API integrations.

## JSON Format (Output-Oriented)

The JSON format wraps query results in a structured JSON object including column metadata, row data, row count, and statistics:

```sql
SELECT id, name, value FROM my_table LIMIT 2 FORMAT JSON;
```

Output:

```json
{
    "meta": [
        {"name": "id", "type": "UInt64"},
        {"name": "name", "type": "String"},
        {"name": "value", "type": "Float64"}
    ],
    "data": [
        {"id": 1, "name": "alpha", "value": 3.14},
        {"id": 2, "name": "beta", "value": 2.71}
    ],
    "rows": 2,
    "statistics": {"elapsed": 0.001, "rows_read": 2, "bytes_read": 56}
}
```

This is useful for API responses, dashboards, and debugging. While modern ClickHouse versions do support INSERT with FORMAT JSON, JSONEachRow is typically preferred for ingestion because it is streaming-friendly.

## JSONEachRow Format (NDJSON)

JSONEachRow emits one JSON object per line (newline-delimited JSON). It works for both input and output:

```sql
SELECT id, name, value FROM my_table FORMAT JSONEachRow;
```

Output:

```text
{"id":1,"name":"alpha","value":3.14}
{"id":2,"name":"beta","value":2.71}
```

## Importing Data with JSONEachRow

```bash
# Insert from a file
clickhouse-client \
    --query "INSERT INTO events FORMAT JSONEachRow" \
    < events.ndjson
```

Via HTTP:

```bash
curl -X POST \
    "http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow" \
    --data-binary @events.ndjson
```

## Handling Missing Fields

ClickHouse fills missing fields with default values:

```sql
SET input_format_defaults_for_omitted_fields = 1;

-- This row is missing 'value' - it gets default value 0
INSERT INTO my_table FORMAT JSONEachRow;
-- {"id": 3, "name": "gamma"}
```

## Nested Objects

One simple approach is to store nested objects as a String column containing the serialized JSON. For richer handling (including dot-notation into Nested columns), enable `input_format_import_nested_json = 1`:

```sql
CREATE TABLE events (
    id UInt64,
    user_id UInt64,
    metadata String
) ENGINE = MergeTree() ORDER BY id;

-- Nested JSON stored as String
INSERT INTO events FORMAT JSONEachRow;
-- {"id":1,"user_id":42,"metadata":"{\"browser\":\"chrome\",\"os\":\"linux\"}"}
```

## JSONEachRowWithProgress

For long-running queries via HTTP, use JSONEachRowWithProgress to get progress updates:

```sql
SELECT * FROM large_table FORMAT JSONEachRowWithProgress;
```

## Choosing Between JSON and JSONEachRow

```text
JSON:          Rich metadata, single object, output only
JSONEachRow:   Streaming-friendly, input and output, one object per line
```

Use JSON for API responses where clients expect structured metadata. Use JSONEachRow for data pipelines, Kafka integration, and file-based import/export.

## Summary

JSONEachRow is ClickHouse's workhorse JSON format - it supports both import and export, is streaming-friendly, and integrates well with Kafka, log shippers, and data pipelines. The JSON format is better for ad-hoc query results and API responses where column metadata and statistics are useful. Always choose the format based on what the consumer expects.
