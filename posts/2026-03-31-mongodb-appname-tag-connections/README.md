# How to Use the appName Option to Tag Connections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection, Monitoring, Configuration, Diagnostic

Description: Learn how to use the appName option in MongoDB connection strings to tag connections with application identifiers for easier monitoring and diagnostics.

---

## What Is appName?

The `appName` option attaches a human-readable identifier to every connection the driver establishes. This name appears in the MongoDB server logs, `currentOp` output, and profiler data. It makes it much easier to trace which application or service is responsible for a specific query or connection when multiple applications share a MongoDB cluster.

## Connection String Format

```text
mongodb://host:27017/mydb?appName=myapp-api-service
```

## Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017', {
  appName: 'checkout-service',
});

await client.connect();
```

## PyMongo

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    appName="checkout-service",
)
```

## Java Driver

```java
import com.mongodb.MongoClientSettings;

MongoClientSettings settings = MongoClientSettings.builder()
    .applicationName("checkout-service")
    .build();
```

## Viewing appName in Server Logs

When `appName` is set, it appears in the MongoDB log entries:

```json
{
  "t": "2026-03-31T10:00:00.000+0000",
  "s": "I",
  "c": "NETWORK",
  "id": 51800,
  "msg": "client metadata",
  "attr": {
    "remote": "192.168.1.100:54321",
    "client": {
      "application": { "name": "checkout-service" },
      "driver": { "name": "nodejs", "version": "5.0.0" },
      "os": { "type": "Linux" }
    }
  }
}
```

## Viewing Active Connections by appName

Use `currentOp` in mongosh to see which application is running which operations:

```javascript
// In mongosh
db.adminCommand({ currentOp: true }).inprog
  .filter(op => op.clientMetadata?.application?.name === 'checkout-service')
  .map(op => ({ opid: op.opid, ns: op.ns, secs: op.secs_running }))
```

## Naming Conventions

Good `appName` values help distinguish between different services and environments:

```text
Bad:   myapp
Good:  checkout-service-prod
Good:  user-service-v2-staging
Good:  analytics-batch-job
Good:  admin-panel-eu-west
```

Include the environment and service name to make filtering in logs easier.

## appName in Profiler Output

When the slow query profiler captures an operation, the `appName` appears as a top-level field in the profile document:

```javascript
// In mongosh - query profiler output
db.system.profile.findOne({ "appName": "checkout-service" })
// Returns the most recent slow query from checkout-service
```

## Limits

The `appName` value is limited to 128 bytes. Values longer than 128 bytes are silently truncated by the driver.

```javascript
// Max 128 bytes
const client = new MongoClient(uri, {
  appName: 'my-very-long-service-name-that-exceeds-128-bytes-will-be-truncated',
});
```

## Summary

Always set `appName` in production MongoDB connection strings. It costs nothing in performance and provides significant operational value when debugging slow queries, identifying connection leaks, or tracing which service is causing an issue in a shared MongoDB cluster. Use a naming convention that includes the service name and environment.
