# How to Use Prepared Statements in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Prepared Statement, SQL, Security, Performance

Description: Understand how prepared statements work in ClickHouse, including client-side emulation, bind parameters, and best practices for safe query execution.

---

ClickHouse does not implement server-side prepared statements in the traditional RDBMS sense, but it supports server-side parameterized queries via the `{name:Type}` syntax, and client libraries provide additional parameter binding mechanisms. Understanding this distinction helps you write safe and efficient code.

## Server-Side vs Client-Side Preparation

Traditional databases (PostgreSQL, MySQL) parse and plan queries server-side on `PREPARE`, caching the query plan for reuse. ClickHouse does not cache query plans, but it does support server-side parameterized queries using the `{name:Type}` placeholder syntax. Parameters are passed separately from the query text and substituted by the server, preventing SQL injection. Some client drivers also offer client-side parameter substitution (e.g., `%(name)s` in clickhouse-driver) where the driver escapes and inlines values before sending the query.

## Python with clickhouse-driver

```python
from clickhouse_driver import Client

client = Client('localhost')

rows = [
    {'ts': '2026-01-01 00:00:00', 'user_id': 'u1', 'event_type': 'click'},
    {'ts': '2026-01-01 00:00:01', 'user_id': 'u2', 'event_type': 'view'},
]

client.execute(
    "INSERT INTO events (ts, user_id, event_type) VALUES",
    rows
)
```

## HTTP Interface with Query Parameters

The HTTP interface supports typed parameters directly in the URL:

```bash
curl "http://localhost:8123/" \
  --data-urlencode "query=SELECT count() FROM events WHERE user_id={uid:String} AND ts > {since:DateTime}" \
  -G --data-urlencode "param_uid=abc123" \
     --data-urlencode "param_since=2026-01-01 00:00:00"
```

## Node.js with @clickhouse/client

```typescript
import { createClient } from '@clickhouse/client';

const client = createClient({ host: 'http://localhost:8123' });

const result = await client.query({
  query: 'SELECT * FROM events WHERE user_id = {uid:String}',
  query_params: { uid: 'abc123' },
  format: 'JSONEachRow',
});
```

## Batch Inserts as Prepared Statements

For high-throughput inserts, batch multiple rows in one call:

```python
client.execute(
    "INSERT INTO metrics (ts, host, value) VALUES",
    [(row['ts'], row['host'], row['value']) for row in batch]
)
```

This is more efficient than one insert per row.

## When to Use Query Settings

You can attach per-query settings to parameterized calls:

```python
client.execute(
    "SELECT * FROM large_table WHERE id = %(id)s",
    {'id': 42},
    settings={'max_execution_time': 30}
)
```

## Summary

ClickHouse prepared statements are client-side parameter binding rather than server-side plans. Use typed `{name:Type}` parameters via HTTP or driver-native binding to achieve safe, reusable queries with minimal overhead.
