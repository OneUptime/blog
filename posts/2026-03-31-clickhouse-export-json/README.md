# How to Export ClickHouse Data to JSON Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Export, JSON, JSONEachRow, Data Export

Description: Learn how to export ClickHouse query results to JSON files using JSONEachRow, JSON, and JSONCompact formats via the HTTP interface and clickhouse-client.

---

ClickHouse supports multiple JSON output formats, making it straightforward to export data for APIs, data pipelines, and downstream consumers.

## Exporting as JSON Lines (JSONEachRow)

Each row becomes one JSON object on a separate line - ideal for streaming and line-by-line processing:

```bash
clickhouse-client \
  --host clickhouse \
  --query "SELECT * FROM events WHERE date = today()" \
  --format JSONEachRow \
  > events.ndjson
```

## Exporting as a JSON Array

`JSON` format wraps output in a metadata envelope with a `data` array:

```bash
curl 'http://clickhouse:8123/?query=SELECT+*+FROM+events+LIMIT+100&default_format=JSON' \
  -H 'X-ClickHouse-User: default' \
  -H 'X-ClickHouse-Key: secret' \
  > events.json
```

Output structure:

```json
{
  "meta": [{"name": "ts", "type": "DateTime"}, ...],
  "data": [{"ts": "2026-03-31 10:00:00", ...}],
  "rows": 100
}
```

## Compact JSON Format

`JSONCompact` reduces size by using arrays instead of objects:

```bash
clickhouse-client \
  --query "SELECT user_id, event_type, count() FROM events GROUP BY 1,2" \
  --format JSONCompact \
  > summary.json
```

## Exporting with Specific Column Types

Use `JSONEachRowWithProgress` to track export progress for large queries. Progress events are emitted inline with row data in the output stream as `{"progress":{...}}` objects alongside `{"row":{...}}` objects:

```bash
clickhouse-client \
  --query "SELECT * FROM large_table" \
  --format JSONEachRowWithProgress \
  > large_table.ndjson
```

## Streaming to S3 as JSON

```sql
INSERT INTO FUNCTION s3(
    'https://s3.amazonaws.com/mybucket/exports/events.ndjson.gz',
    'AWS_KEY', 'AWS_SECRET',
    'JSONEachRow',
    'gzip'
)
SELECT * FROM events
WHERE ts >= today() - 7;
```

## Python Export Script

```python
import json
from clickhouse_driver import Client

client = Client('clickhouse')

rows_gen = client.execute_iter('SELECT * FROM events', with_column_types=True)
columns = [name for name, _ in next(rows_gen)]

with open('events.ndjson', 'w') as f:
    for row in rows_gen:
        f.write(json.dumps(dict(zip(columns, row)), default=str) + '\n')
```

## Summary

ClickHouse exports data in `JSONEachRow` (newline-delimited), `JSON` (envelope with metadata), or `JSONCompact` format. Use `JSONEachRow` for pipeline compatibility and streaming to S3. For large tables, use `execute_iter` in Python to avoid loading the full result into memory.
