# How to Use ClickHouse HTTP Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, HTTP, REST, Integration, API

Description: Learn how to query ClickHouse over HTTP using curl and any HTTP client, including authentication, output formats, streaming inserts, and query parameter passing.

---

ClickHouse exposes a full SQL query interface over HTTP on port 8123. Any HTTP client - `curl`, `wget`, Python `requests`, or your language's built-in HTTP library - can execute queries and insert data without installing any ClickHouse-specific driver. The HTTP interface is the most universal integration point for ClickHouse and is the foundation of most language clients.

## Default Ports

| Port | Protocol | Use |
|---|---|---|
| 8123 | HTTP | Queries, inserts, DDL |
| 8443 | HTTPS | Encrypted queries (if configured) |
| 9000 | TCP (native) | clickhouse-client, native drivers |

## Simplest Query

```bash
curl 'http://localhost:8123/?query=SELECT+version()'
```

Output:

```text
24.3.1.2672
```

## Query via POST Body

Sending the query in the POST body is preferred for long queries because URLs have length limits:

```bash
curl -X POST 'http://localhost:8123/' \
  --data-binary 'SELECT number, number * 2 AS doubled FROM numbers(5)'
```

## Authentication

```bash
# Basic auth header
curl 'http://localhost:8123/?database=default' \
  -H 'X-ClickHouse-User: default' \
  -H 'X-ClickHouse-Key: yourpassword' \
  --data-binary 'SELECT count() FROM events'

# URL parameters (less secure, password visible in logs)
curl 'http://localhost:8123/?user=default&password=yourpassword' \
  --data-binary 'SELECT 1'
```

## Output Formats

ClickHouse supports over 20 output formats via the `FORMAT` clause or the `default_format` parameter:

```bash
# JSON
curl 'http://localhost:8123/' \
  --data-binary 'SELECT user_id, count() AS cnt FROM events GROUP BY user_id LIMIT 5 FORMAT JSON'

# JSONEachRow (one JSON object per line - NDJSON)
curl 'http://localhost:8123/' \
  --data-binary 'SELECT user_id, cnt FROM (SELECT user_id, count() AS cnt FROM events GROUP BY user_id) LIMIT 5 FORMAT JSONEachRow'

# CSV
curl 'http://localhost:8123/' \
  --data-binary 'SELECT user_id, count() AS cnt FROM events GROUP BY user_id LIMIT 5 FORMAT CSV'

# TSV
curl 'http://localhost:8123/' \
  --data-binary 'SELECT user_id, count() AS cnt FROM events GROUP BY user_id LIMIT 5 FORMAT TSV'

# Parquet (download as binary)
curl 'http://localhost:8123/' \
  --data-binary 'SELECT * FROM events LIMIT 1000 FORMAT Parquet' \
  --output /tmp/events.parquet
```

## Query Parameters

Pass query settings as URL parameters:

```bash
curl 'http://localhost:8123/?max_execution_time=10&max_memory_usage=5000000000' \
  --data-binary 'SELECT count() FROM very_large_table'
```

## Parameterized Queries

ClickHouse supports typed query parameters to prevent SQL injection:

```bash
curl 'http://localhost:8123/?param_uid=1001&param_since=2024-01-01+00:00:00' \
  --data-binary "SELECT count() FROM events WHERE user_id = {uid: UInt64} AND created_at >= {since: DateTime}"
```

The `param_` prefix maps to `{name: Type}` placeholders in the SQL text.

## Insert Data

```bash
# Insert CSV rows
echo -e "1001,purchase,2024-01-15 10:00:00\n1002,page_view,2024-01-15 10:01:00" | \
  curl 'http://localhost:8123/?query=INSERT+INTO+events+(user_id,event_name,created_at)+FORMAT+CSV' \
  --data-binary @-
```

```bash
# Insert NDJSON (JSONEachRow)
printf '{"user_id":1001,"event_name":"click","created_at":"2024-01-15 10:00:00"}\n{"user_id":1002,"event_name":"view","created_at":"2024-01-15 10:01:00"}\n' | \
  curl 'http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow' \
  --data-binary @-
```

## Stream Insert from a File

```bash
# Stream a large CSV file directly into ClickHouse without loading it into memory
curl 'http://localhost:8123/?query=INSERT+INTO+events+FORMAT+CSV' \
  -H 'Content-Type: text/plain' \
  --data-binary @/path/to/large_file.csv
```

## Gzip Compressed Requests

```bash
# Compress the request body to reduce bandwidth
gzip -c /path/to/data.jsonl | \
  curl 'http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow' \
  -H 'Content-Encoding: gzip' \
  --data-binary @-
```

## Compressed Responses

```bash
# Request gzip-compressed response
curl 'http://localhost:8123/' \
  -H 'Accept-Encoding: gzip' \
  --data-binary 'SELECT * FROM events LIMIT 100000 FORMAT JSONEachRow' \
  --compressed \
  > /tmp/events.jsonl
```

## Run a Query with Python requests

```python
import requests

url = 'http://localhost:8123/'
headers = {
    'X-ClickHouse-User': 'default',
    'X-ClickHouse-Key': '',
}

# Query
response = requests.post(
    url,
    data='SELECT user_id, count() AS cnt FROM events GROUP BY user_id ORDER BY cnt DESC LIMIT 10 FORMAT JSONEachRow',
    headers=headers,
)
response.raise_for_status()

for line in response.text.strip().split('\n'):
    import json
    row = json.loads(line)
    print(f"User {row['user_id']}: {row['cnt']} events")
```

## Check Server Health

```bash
# /ping endpoint returns "Ok." with HTTP 200
curl -s 'http://localhost:8123/ping'

# Check HTTP status code
if curl -s -f 'http://localhost:8123/ping' > /dev/null; then
    echo "ClickHouse is up"
else
    echo "ClickHouse is down"
fi
```

## Query ID and Cancellation

```bash
# Assign a custom query_id
curl 'http://localhost:8123/?query_id=my-etl-job-001' \
  --data-binary 'SELECT count() FROM events'

# Cancel by query_id (from another terminal)
curl 'http://localhost:8123/' \
  --data-binary "KILL QUERY WHERE query_id='my-etl-job-001'"
```

## DDL Over HTTP

```bash
curl -X POST 'http://localhost:8123/' \
  -H 'X-ClickHouse-User: default' \
  -H 'X-ClickHouse-Key: password' \
  --data-binary "CREATE TABLE IF NOT EXISTS logs (
      ts      DateTime,
      level   LowCardinality(String),
      message String
  ) ENGINE = MergeTree() ORDER BY ts"
```

## HTTPS Configuration

Enable HTTPS in `config.xml`:

```xml
<https_port>8443</https_port>
<openSSL>
    <server>
        <certificateFile>/etc/clickhouse-server/server.crt</certificateFile>
        <privateKeyFile>/etc/clickhouse-server/server.key</privateKeyFile>
        <verificationMode>none</verificationMode>
    </server>
</openSSL>
```

```bash
# Query over HTTPS
curl -s 'https://localhost:8443/?query=SELECT+1' \
  --cacert /etc/clickhouse-server/ca.crt
```

## Async Insert via HTTP

```bash
curl 'http://localhost:8123/?async_insert=1&wait_for_async_insert=0' \
  --data-binary 'INSERT INTO events FORMAT JSONEachRow {"user_id":1,"event_name":"click","created_at":"2024-01-15 10:00:00"}'
```

## Use the HTTP Interface in a Shell ETL Script

```bash
#!/usr/bin/env bash
# Daily export: query ClickHouse and save results as CSV

DATE="${1:-$(date +%Y-%m-%d)}"
OUTPUT="/data/export/events_${DATE}.csv"

curl -s "http://localhost:8123/" \
  -H "X-ClickHouse-User: default" \
  -H "X-ClickHouse-Key: ${CH_PASSWORD}" \
  --data-binary "
    SELECT
        event_id,
        user_id,
        event_name,
        created_at
    FROM events
    WHERE toDate(created_at) = '${DATE}'
    FORMAT CSVWithNames
  " > "${OUTPUT}"

rows=$(wc -l < "${OUTPUT}")
echo "Exported $((rows - 1)) rows to ${OUTPUT}"
```

## Common Pitfalls

- Always URL-encode query strings or send queries in the POST body. Spaces and special characters in URL query parameters cause parsing errors.
- The HTTP interface does not support multi-statement queries. Send each SQL statement as a separate HTTP request.
- Large INSERT requests must use streaming (pipe data via stdin or `@-`). Do not build a single enormous request body in memory.
- The `/ping` endpoint does not execute a query - it only checks that the server process is alive. Use `SELECT 1` over HTTP for a deeper health check that exercises the query engine.

## Summary

The ClickHouse HTTP interface is the most universal way to integrate with ClickHouse. Use `curl` for scripts and debugging, the Python `requests` library for lightweight pipelines, and any HTTP client library in your language of choice for application integration. The interface supports all ClickHouse output formats, authentication, query parameters, compression, and async inserts without requiring a dedicated driver.
