# How to Use Capped Collections for Log Storage in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capped Collection, Log Storage, Application Logging, Database Design

Description: Learn how to design and use MongoDB capped collections for high-throughput application log storage with automatic size management and natural ordering.

---

## Overview

Capped collections are an excellent fit for application log storage because they insert documents in order, maintain a bounded size without requiring manual cleanup, and support high-throughput writes. This guide walks through designing a logging system backed by MongoDB capped collections.

## Designing the Log Schema

Keep log documents small to maximize the number of entries within the size limit:

```javascript
{
  ts: ISODate("2026-03-31T10:00:00Z"),  // timestamp
  lvl: "ERROR",                          // log level
  svc: "api-gateway",                    // service name
  msg: "Failed to connect to upstream",  // message
  meta: {                                // optional extra fields
    statusCode: 503,
    targetHost: "backend-1"
  }
}
```

## Creating the Log Collection

Size the collection based on your expected log volume and retention period:

```javascript
// ~150 bytes per log entry, keep ~65k entries = roughly 10 MB
db.createCollection("appLogs", {
  capped: true,
  size: 10485760,  // 10 MB
  max: 65000       // hard cap at 65k documents
});
```

For high-volume services, increase the size accordingly:

```javascript
// For a service logging 10k entries/sec, keep about 1 hour of logs
// Estimated: 10000 * 3600 * 100 bytes = ~3.6 GB
db.createCollection("highVolumeLogs", {
  capped: true,
  size: 3758096384  // 3.5 GB
});
```

## Writing a Logger in Node.js

```javascript
const { MongoClient } = require("mongodb");

class MongoLogger {
  constructor(collection) {
    this.collection = collection;
  }

  async log(level, service, message, meta = {}) {
    await this.collection.insertOne({
      ts: new Date(),
      lvl: level,
      svc: service,
      msg: message,
      meta
    });
  }

  info(service, message, meta) {
    return this.log("INFO", service, message, meta);
  }

  warn(service, message, meta) {
    return this.log("WARN", service, message, meta);
  }

  error(service, message, meta) {
    return this.log("ERROR", service, message, meta);
  }
}

// Usage
const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const collection = client.db("myapp").collection("appLogs");
const logger = new MongoLogger(collection);

await logger.info("auth-service", "User logged in", { userId: "u123" });
await logger.error("payment-service", "Charge failed", { orderId: "o456", code: "card_declined" });
```

## Querying Log Entries

Retrieve the most recent log entries:

```javascript
// Last 100 log entries across all services
db.appLogs.find().sort({ $natural: -1 }).limit(100);

// Last 50 error entries for a specific service
db.appLogs.find(
  { lvl: "ERROR", svc: "api-gateway" }
).sort({ $natural: -1 }).limit(50);

// Logs in a time range
db.appLogs.find({
  ts: {
    $gte: new Date("2026-03-31T09:00:00Z"),
    $lte: new Date("2026-03-31T10:00:00Z")
  }
}).sort({ $natural: 1 });
```

## Adding an Index for Time-Range Queries

While capped collections are not ideal for arbitrary queries, a timestamp index helps with time-range lookups:

```javascript
db.appLogs.createIndex({ ts: -1 });
db.appLogs.createIndex({ svc: 1, ts: -1 });
```

Be aware that indexes increase write overhead and collection size.

## Streaming Logs in Real Time

Use a tailable cursor to stream new log entries as they arrive:

```javascript
async function streamErrors(collection) {
  const cursor = collection.find(
    { lvl: "ERROR" },
    { tailable: true, awaitData: true }
  );

  for await (const log of cursor) {
    console.error(`[${log.ts.toISOString()}] ${log.svc}: ${log.msg}`);
    // send alert, push to Slack, etc.
  }
}
```

## Log Rotation Without Cron Jobs

With capped collections, log rotation is automatic. When the collection reaches its configured size, MongoDB overwrites the oldest documents. No external cron job or TTL index is needed for basic rotation.

For multiple log retention tiers, use separate collections:

```javascript
// Short-term: keep last 5 minutes at high resolution
db.createCollection("logsRecent", { capped: true, size: 52428800, max: 50000 });

// Long-term: keep last 7 days at lower resolution (sampled writes)
db.createCollection("logsArchive", { capped: true, size: 1073741824 });
```

## Summary

MongoDB capped collections simplify log storage by providing automatic size-bounded retention, insertion-order guarantee, and support for real-time tailing via tailable cursors. Design your log schema to be compact, size the collection based on your retention needs, and optionally add timestamp and service indexes for efficient queries without sacrificing write throughput.
