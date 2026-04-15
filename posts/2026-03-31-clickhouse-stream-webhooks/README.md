# How to Stream Data from Webhooks to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Webhook, Data Streaming, Node.js, Event Ingestion

Description: Learn how to build a webhook receiver that streams event data directly into ClickHouse with batching and signature verification.

---

Webhooks push events from third-party services (payment processors, CRMs, analytics platforms) in real time. A webhook-to-ClickHouse pipeline captures these events for analytics and auditing.

## Architecture

```text
External Service --> Webhook Receiver (HTTP) --> Batch Buffer --> ClickHouse
```

## Target Table

```sql
CREATE TABLE webhook_events (
    received_at DateTime DEFAULT now(),
    source LowCardinality(String),
    event_type LowCardinality(String),
    payload String,
    idempotency_key String
) ENGINE = ReplacingMergeTree(received_at)
PARTITION BY toYYYYMM(received_at)
ORDER BY (source, idempotency_key)
TTL received_at + INTERVAL 180 DAY;
```

`ReplacingMergeTree` on `idempotency_key` deduplicates webhook retries.

## Node.js Webhook Receiver

```javascript
const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@clickhouse/client');

const app = express();
const client = createClient({ url: 'http://clickhouse:8123' });

app.use(express.raw({ type: 'application/json' }));

const buffer = [];
let flushTimer;

async function flushBuffer() {
    clearTimeout(flushTimer);
    flushTimer = null;
    const rows = buffer.splice(0);
    if (rows.length > 0) {
        await client.insert({ table: 'webhook_events', values: rows, format: 'JSONEachRow' });
    }
}

function scheduleFlush() {
    if (!flushTimer) {
        flushTimer = setTimeout(flushBuffer, 2000);
    }
}

app.post('/webhook/:source', (req, res) => {
    const sig = req.headers['x-signature'] || '';
    const expected = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(req.body).digest('hex');

    if (sig.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return res.status(401).send('Invalid signature');
    }

    const payload = JSON.parse(req.body);
    buffer.push({
        source: req.params.source,
        event_type: payload.type || 'unknown',
        payload: req.body.toString(),
        idempotency_key: payload.id || crypto.randomUUID()
    });

    if (buffer.length >= 500) flushBuffer();
    else scheduleFlush();

    res.status(202).send('Accepted');
});

app.listen(3000);
```

## Querying Webhook Events

```sql
SELECT
    source,
    event_type,
    count() AS event_count,
    max(received_at) AS latest
FROM webhook_events
WHERE received_at >= now() - INTERVAL 24 HOUR
GROUP BY source, event_type
ORDER BY event_count DESC;
```

## Handling Deduplication

Since webhooks retry on delivery failure, use FINAL to read deduplicated data:

```sql
SELECT * FROM webhook_events FINAL
WHERE idempotency_key = 'evt_abc123';
```

## Summary

A webhook-to-ClickHouse pipeline collects events via HTTP, validates signatures, batches them in memory, and flushes to ClickHouse on a timer or size threshold. Use `ReplacingMergeTree` on the idempotency key to deduplicate retried webhooks automatically.
