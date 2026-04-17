# How to Set Up a ClickHouse Data Ingestion API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Ingestion, HTTP API, REST, Analytics

Description: Learn how to build a data ingestion API for ClickHouse using its HTTP interface, async inserts, and buffer tables to handle high-throughput event streams.

---

A ClickHouse data ingestion API receives events from applications and writes them efficiently to ClickHouse. You can use ClickHouse's built-in HTTP interface directly or build a lightweight proxy with async inserts and buffering.

## Direct HTTP Insert

ClickHouse accepts INSERT statements over HTTP:

```bash
curl -X POST 'http://clickhouse:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow' \
  -H 'Content-Type: application/json' \
  -u 'user:password' \
  -d '{"event_time":"2026-03-31 10:00:00","event_type":"click","user_id":42}'
```

For batch ingestion, send multiple JSON lines:

```bash
curl -X POST 'http://clickhouse:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow' \
  -d '{"event_time":"2026-03-31 10:00:00","event_type":"click","user_id":42}
{"event_time":"2026-03-31 10:00:01","event_type":"view","user_id":43}'
```

## Enabling Async Inserts

Async inserts let ClickHouse buffer small writes and flush them in batches, reducing part merges:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 0;
SET async_insert_max_data_size = '10M';
SET async_insert_busy_timeout_ms = 200;
```

Or pass settings per HTTP request:

```bash
curl -X POST 'http://clickhouse:8123/?async_insert=1&wait_for_async_insert=0&query=INSERT+INTO+metrics+FORMAT+JSONEachRow' \
  --data-binary '{"ts":"2026-03-31T10:00:00Z","metric":"cpu","value":72.5}'
```

## Buffer Table for High-Throughput APIs

A Buffer table holds rows in memory and flushes to the destination on a schedule:

```sql
CREATE TABLE events_buffer AS events
ENGINE = Buffer(
    default, events,
    16,          -- num layers
    10, 60,      -- min/max seconds before flush
    10000, 1000000,  -- min/max rows
    10000000, 1000000000  -- min/max bytes
);
```

Applications insert into `events_buffer`; ClickHouse flushes to `events` automatically.

## Node.js Ingestion Proxy Example

```javascript
const http = require('http');
const { createClient } = require('@clickhouse/client');

const client = createClient({ url: 'http://clickhouse:8123', username: 'default' });

http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/ingest') {
    const body = await readBody(req);
    const rows = body.trim().split('\n').map(JSON.parse);
    await client.insert({ table: 'events', values: rows, format: 'JSONEachRow' });
    res.writeHead(204);
    res.end();
  }
}).listen(3000);
```

## Summary

ClickHouse's HTTP interface supports direct INSERT via curl or client libraries. Enable async inserts to batch small writes, or use a Buffer table to absorb burst traffic. For a production API, add authentication, schema validation, and a retry queue in front of the insert path.
