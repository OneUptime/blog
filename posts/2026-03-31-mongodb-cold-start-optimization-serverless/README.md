# How to Optimize Cold Start Times with MongoDB in Serverless

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Serverless, Performance, Cold Start, Connection

Description: Learn practical techniques to reduce MongoDB cold start latency in serverless functions including connection pooling, DNS caching, and pre-warming strategies.

---

A cold start occurs when a serverless function instance is created from scratch - including establishing a fresh MongoDB connection. A typical Atlas connection adds 200-800ms to cold start time. This guide covers every practical optimization to bring that number down.

## Benchmark: What Makes a Cold Start Slow

```text
Cold start breakdown (typical):
  - Function container init:     50-200ms
  - Node.js module loading:      50-150ms
  - DNS resolution for Atlas:    20-100ms  <-- optimizable
  - TCP handshake + TLS:        100-300ms  <-- optimizable
  - MongoDB auth (SCRAM-SHA):    50-100ms  <-- optimizable
  Total cold start:             270-850ms
```

## 1. Reduce Package Size

Smaller bundles load faster. Tree-shake Mongoose to include only what you need:

```bash
# Check your bundle size
npx bundlesize
```

```javascript
// Only import the Mongoose core - avoid requiring the full library if using the Node driver
const { MongoClient } = require('mongodb'); // 1.5MB
// vs
const mongoose = require('mongoose'); // 3.5MB
```

For extremely latency-sensitive functions, use the MongoDB Node.js driver directly instead of Mongoose.

## 2. Cache DNS Resolution

MongoDB Atlas hostnames involve DNS SRV lookups. Reduce repeat lookups with `family: 4`:

```javascript
const mongoose = require('mongoose');

await mongoose.connect(process.env.MONGODB_URI, {
  family: 4,                      // Force IPv4 - avoids IPv6 fallback delays
  serverSelectionTimeoutMS: 3000,
  maxPoolSize: 3,
  minPoolSize: 0,
});
```

## 3. Use Connection String with Direct Hosts

Instead of the SRV connection string (which requires DNS lookup), use a direct connection string when possible:

```text
SRV (2 extra DNS lookups - SRV + TXT):
  mongodb+srv://cluster.mongodb.net/db

Direct (no SRV/TXT lookups):
  mongodb://host1:27017,host2:27017,host3:27017/db?replicaSet=atlas-xxx
```

## 4. Keep minPoolSize at 0

In serverless, idle connections waste Atlas connection limit. Set `minPoolSize: 0`:

```javascript
const options = {
  maxPoolSize: 3,
  minPoolSize: 0,         // Don't keep idle connections open
  maxIdleTimeMS: 60000,   // Close connections idle for 60s
  serverSelectionTimeoutMS: 5000,
};
```

## 5. Move Heavy Imports Outside the Handler

Module imports are cached after the first load. Put them at the top level:

```javascript
// GOOD - loaded once on cold start, cached for warm invocations
const mongoose = require('mongoose');
const User = require('./models/User');

exports.handler = async (event) => {
  // Just reconnect if needed - no model loading overhead
  await connectDB();
  ...
};
```

```javascript
// BAD - re-imported on every invocation
exports.handler = async (event) => {
  const mongoose = require('mongoose'); // inefficient
  const User = require('./models/User'); // inefficient
  ...
};
```

## 6. Pre-Warm with a Scheduled Ping

Keep function instances alive by invoking them on a schedule:

```javascript
// AWS Lambda: scheduled warm-up
exports.warmUp = async () => {
  await connectDB();
  await mongoose.connection.db.command({ ping: 1 });
  return { statusCode: 200 };
};
```

```yaml
# serverless.yml
functions:
  warmUp:
    handler: src/warmUp.handler
    events:
      - schedule: rate(5 minutes)
```

## 7. Use Atlas Private Endpoints

Private endpoints eliminate public internet routing and reduce connection latency:

```bash
# AWS PrivateLink for Atlas
# Add to MongoDB Atlas: Network Access > Private Endpoint > AWS
# Then use the private endpoint hostname in MONGODB_URI
```

## 8. Measure Cold Start Impact

```javascript
exports.handler = async (event) => {
  const dbStart = Date.now();
  await connectDB();
  const dbTime = Date.now() - dbStart;

  console.log(JSON.stringify({ event: 'cold_start_db', durationMs: dbTime }));
  ...
};
```

## Summary

The biggest wins come from caching the connection in module scope (already standard), using `family: 4` for DNS, setting `minPoolSize: 0`, and co-locating the serverless function with the MongoDB Atlas cluster in the same cloud region. For the most latency-sensitive paths, switch from Mongoose to the lightweight MongoDB Node.js driver and consider Atlas private endpoints to remove public internet routing overhead.
