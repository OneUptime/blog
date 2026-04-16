# How to Use ClickHouse Node.js Client (@clickhouse/client)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Node.js, JavaScript, Client, Database

Description: Learn how to connect to ClickHouse from Node.js using the official @clickhouse/client package, run queries, insert data, and stream results.

---

## Installing @clickhouse/client

```bash
npm install @clickhouse/client
# or
yarn add @clickhouse/client
```

## Creating a Client

```javascript
import { createClient } from '@clickhouse/client';

const client = createClient({
  url: 'http://localhost:8123',
  username: 'default',
  password: '',
  database: 'default',
});
```

For HTTPS/SSL connections:

```javascript
import { createClient } from '@clickhouse/client';
import { readFileSync } from 'fs';

const client = createClient({
  url: 'https://your-clickhouse-host:8443',
  username: 'default',
  password: 'your_password',
  tls: {
    ca_cert: readFileSync('/path/to/ca.crt'),
  },
});
```

## Running SELECT Queries

```javascript
import { createClient } from '@clickhouse/client';

const client = createClient({ url: 'http://localhost:8123' });

async function queryData() {
  const resultSet = await client.query({
    query: 'SELECT count() FROM system.tables',
    format: 'JSONEachRow',
  });

  const rows = await resultSet.json();
  console.log(rows);
}

queryData();
```

## Parameterized Queries

```javascript
const resultSet = await client.query({
  query: `
    SELECT user_id, event_type, ts
    FROM user_events
    WHERE event_type = {event_type: String}
      AND ts >= {from: DateTime}
    LIMIT 100
  `,
  query_params: {
    event_type: 'purchase',
    from: new Date('2026-01-01').toISOString(),
  },
  format: 'JSONEachRow',
});

const rows = await resultSet.json();
```

## Inserting Data

```javascript
import { createClient } from '@clickhouse/client';

const client = createClient({ url: 'http://localhost:8123' });

async function insertData() {
  await client.insert({
    table: 'user_events',
    values: [
      { user_id: 1001, event_type: 'login', ts: '2026-03-31 10:00:00' },
      { user_id: 1002, event_type: 'purchase', ts: '2026-03-31 10:01:00' },
      { user_id: 1003, event_type: 'logout', ts: '2026-03-31 10:05:00' },
    ],
    format: 'JSONEachRow',
  });

  console.log('Data inserted');
}

insertData();
```

## Streaming Large Result Sets

```javascript
import { createClient } from '@clickhouse/client';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const client = createClient({ url: 'http://localhost:8123' });

async function streamToFile() {
  const resultSet = await client.query({
    query: 'SELECT * FROM large_events LIMIT 1000000',
    format: 'JSONEachRow',
  });

  const stream = resultSet.stream();

  stream.on('data', (rows) => {
    rows.forEach((row) => {
      const parsed = row.json();
      // Process each row
    });
  });

  await new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });
}
```

## Using JSONCompact Format for Performance

```javascript
const resultSet = await client.query({
  query: `
    SELECT user_id, sum(amount) AS total
    FROM orders
    GROUP BY user_id
    ORDER BY total DESC
    LIMIT 1000
  `,
  format: 'JSONCompactEachRow',
});

const rows = await resultSet.json();
// Returns arrays: [[user_id, total], ...]
```

## Inserting with Streams

```javascript
import { createClient } from '@clickhouse/client';
import { Readable } from 'stream';

const client = createClient({ url: 'http://localhost:8123' });

async function insertStream() {
  const stream = new Readable({ objectMode: true, read() {} });

  // Push rows
  for (let i = 0; i < 10000; i++) {
    stream.push({ user_id: i, event_type: 'click', ts: new Date().toISOString() });
  }
  stream.push(null); // End stream

  await client.insert({
    table: 'user_events',
    values: stream,
    format: 'JSONEachRow',
  });
}
```

## Closing the Client

```javascript
// Always close when done to release connections
await client.close();
```

## Error Handling

```javascript
import { createClient, ClickHouseError } from '@clickhouse/client';

const client = createClient({ url: 'http://localhost:8123' });

try {
  const result = await client.query({
    query: 'SELECT * FROM non_existent_table',
    format: 'JSONEachRow',
  });
  await result.json();
} catch (err) {
  if (err instanceof ClickHouseError) {
    console.error(`ClickHouse error ${err.code}: ${err.message}`);
  } else {
    console.error('Connection error:', err);
  }
}
```

## Summary

The official `@clickhouse/client` Node.js package communicates with ClickHouse over HTTP/HTTPS on port 8123. Use parameterized query syntax `{name: Type}` to safely bind values, `JSONEachRow` format for straightforward object mapping, and stream-based inserts for high-volume data ingestion. Always call `client.close()` when the application shuts down to release connections cleanly.
