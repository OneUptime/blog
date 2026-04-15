# How to Implement Query Parameterization for ClickHouse APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Parameterization, Security, SQL Injection, API Design

Description: Safely parameterize ClickHouse queries in API layers to prevent SQL injection, using typed parameters with the HTTP interface and native client libraries.

---

## Why Parameterization Matters

String interpolation in SQL queries is the root cause of SQL injection vulnerabilities. ClickHouse supports named parameters in both its HTTP interface and native client, allowing values to be passed separately from the query template. This completely eliminates injection risk.

## HTTP Interface Parameterization

ClickHouse's HTTP API supports `{name:type}` placeholder syntax:

```bash
# Safe: parameters passed as URL query params
curl "http://localhost:8123/?query=SELECT+count()+FROM+events+WHERE+event_type+%3D+%7Btype%3AString%7D+AND+event_time+%3E%3D+%7Bsince%3ADateTime%7D" \
  --data-urlencode "param_type=page_view" \
  --data-urlencode "param_since=2026-03-01 00:00:00"
```

The `{type:String}` and `{since:DateTime}` placeholders are replaced server-side by ClickHouse with properly escaped values.

## Node.js Client Parameterization

```javascript
const { createClient } = require('@clickhouse/client');
const client = createClient({ url: 'http://localhost:8123' });

// SAFE: using query_params
async function getEvents(eventType, startDate, limit) {
  const result = await client.query({
    query: `
      SELECT event_time, user_id, page_url
      FROM events
      WHERE event_type = {event_type:String}
        AND event_time >= {start_date:DateTime}
      LIMIT {limit:UInt32}
    `,
    query_params: {
      event_type: eventType,
      start_date: startDate,
      limit: limit,
    },
    format: 'JSONEachRow',
  });
  return result.json();
}

// UNSAFE (never do this):
// query: `SELECT * FROM events WHERE event_type = '${eventType}'`
```

## Python Client Parameterization

```python
import clickhouse_connect

client = clickhouse_connect.get_client(host='localhost')

def get_events(event_type: str, start_date: str, limit: int) -> list:
    result = client.query(
        """
        SELECT event_time, user_id, page_url
        FROM events
        WHERE event_type = {event_type:String}
          AND event_time >= {start_date:DateTime}
        LIMIT {limit:UInt32}
        """,
        parameters={
            'event_type': event_type,
            'start_date': start_date,
            'limit': min(limit, 10000),
        }
    )
    return result.result_rows
```

## Go Driver Parameterization

```go
rows, err := conn.Query(ctx,
    `SELECT event_time, user_id, page_url
     FROM events
     WHERE event_type = {event_type:String}
       AND event_time >= {start_date:DateTime}
     LIMIT {limit:UInt32}`,
    clickhouse.Named("event_type", eventType),
    clickhouse.Named("start_date", startDate),
    clickhouse.Named("limit", limit),
)
```

## Handling Dynamic Column Names

Column names and table names cannot be parameterized - they must be validated against an allowlist:

```javascript
const ALLOWED_COLUMNS = new Set(['event_time', 'user_id', 'page_url', 'event_type']);
const ALLOWED_TABLES = new Set(['events', 'sessions', 'users']);

function buildSafeQuery(tableName, columns) {
  // Validate against allowlist
  if (!ALLOWED_TABLES.has(tableName)) {
    throw new Error(`Table '${tableName}' is not allowed`);
  }
  const safeCols = columns.filter(c => ALLOWED_COLUMNS.has(c));
  if (safeCols.length === 0) {
    throw new Error('No valid columns specified');
  }
  return `SELECT ${safeCols.join(', ')} FROM ${tableName}`;
}
```

## Summary

ClickHouse query parameterization uses `{name:type}` syntax in queries with parameters passed separately via `query_params` (Node.js), `parameters` (Python), or `clickhouse.Named` (Go). This prevents SQL injection by ensuring user-supplied values are never interpolated into the SQL string. For dynamic column and table names that cannot be parameterized, validate them against an explicit allowlist before including them in queries.
