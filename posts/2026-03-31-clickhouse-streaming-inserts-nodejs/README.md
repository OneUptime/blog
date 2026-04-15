# How to Handle Streaming Inserts in ClickHouse from Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Node.js, Streaming, Insert, Performance

Description: Stream large datasets into ClickHouse from Node.js using the official client's streaming insert API to maximize throughput and minimize memory usage.

---

## Why Streaming Inserts

Loading millions of rows via array inserts buffers everything in Node.js memory before sending. Streaming pipes data directly from a source (file, Kafka consumer, generator) to ClickHouse without holding the full dataset in RAM.

## Installation

```bash
npm install @clickhouse/client
```

## Streaming from a Readable Stream

```javascript
import { createClient } from '@clickhouse/client';
import { Readable } from 'stream';

const client = createClient({ url: 'http://localhost:8123', database: 'analytics' });

function* generateRows(count) {
  for (let i = 0; i < count; i++) {
    yield { user_id: i, event: 'view', ts: new Date().toISOString() };
  }
}

const readable = Readable.from(generateRows(500_000));

await client.insert({
  table: 'events',
  values: readable,
  format: 'JSONEachRow',
});

console.log('Stream insert complete');
await client.close();
```

## Streaming from a File

```javascript
import fs from 'fs';
import { createInterface } from 'readline';

async function* readNDJSON(filePath) {
  const rl = createInterface({ input: fs.createReadStream(filePath) });
  for await (const line of rl) {
    if (line.trim()) yield JSON.parse(line);
  }
}

await client.insert({
  table: 'events',
  values: Readable.from(readNDJSON('./events.ndjson')),
  format: 'JSONEachRow',
});
```

## Streaming from a Kafka Consumer

```javascript
import { Kafka } from 'kafkajs';
import { Readable } from 'stream';

const kafka = new Kafka({ clientId: 'ch-inserter', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'clickhouse-sink' });
await consumer.subscribe({ topic: 'events', fromBeginning: false });

const stream = new Readable({ objectMode: true, read() {} });

await consumer.run({
  eachMessage: async ({ message }) => {
    stream.push(JSON.parse(message.value.toString()));
  },
});

// When done consuming, signal end of stream:
// stream.push(null);

await client.insert({
  table: 'events',
  values: stream,
  format: 'JSONEachRow',
});
```

For Kafka, consider batching messages into arrays and flushing every 5,000 rows to avoid too many small inserts.

## Backpressure Handling

Node.js streams handle backpressure automatically. If ClickHouse's write speed is slower than the producer, the `Readable` source pauses automatically via `pause`/`resume` signals.

## Monitoring Insert Progress

```javascript
let rowsWritten = 0;
async function* countedRows(source) {
  for await (const row of source) {
    rowsWritten++;
    yield row;
  }
}

setInterval(() => console.log(`Rows written: ${rowsWritten}`), 1000);

await client.insert({
  table: 'events',
  values: Readable.from(countedRows(generateRows(1_000_000))),
  format: 'JSONEachRow',
});
```

## Summary

ClickHouse's Node.js client supports streaming inserts natively. Pass any `Readable` stream as the `values` option — use `Readable.from()` to convert sync or async generators into a stream. This approach handles datasets of any size without exhausting Node.js heap memory, and backpressure is managed automatically by the stream API when using `Readable.from()` with generators.
