# How to Use the maxPoolSize and minPoolSize Options in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Pool, Performance, Configuration, Driver

Description: Learn how to tune maxPoolSize and minPoolSize in MongoDB to optimize connection pool behavior for throughput, latency, and resource efficiency.

---

## What Is the MongoDB Connection Pool?

MongoDB drivers maintain a pool of persistent TCP connections to avoid the overhead of establishing a new connection for every operation. `maxPoolSize` sets the upper bound on concurrent connections, while `minPoolSize` keeps a minimum number of connections warm and ready even when the application is idle.

## Default Values

```text
maxPoolSize: 100  (default in most drivers)
minPoolSize: 0    (no minimum by default)
```

## Setting Pool Size in the Connection String

```text
mongodb://user:pass@host:27017/mydb?maxPoolSize=50&minPoolSize=5
```

## Node.js Driver Configuration

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017', {
  maxPoolSize: 50,      // max concurrent connections
  minPoolSize: 5,       // keep 5 connections warm
  maxIdleTimeMS: 60000, // close idle connections after 60s
  waitQueueTimeoutMS: 5000, // wait max 5s for a connection from pool
});

await client.connect();
```

## PyMongo Configuration

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    maxPoolSize=50,
    minPoolSize=5,
    maxIdleTimeMS=60000,
    waitQueueTimeoutMS=5000,
)
```

## Java Driver Configuration

```java
import com.mongodb.MongoClientSettings;
import com.mongodb.connection.ConnectionPoolSettings;
import java.util.concurrent.TimeUnit;

MongoClientSettings settings = MongoClientSettings.builder()
    .applyToConnectionPoolSettings(builder ->
        builder.maxSize(50)
               .minSize(5)
               .maxConnectionIdleTime(60, TimeUnit.SECONDS)
               .maxWaitTime(5, TimeUnit.SECONDS))
    .build();
```

## How to Choose the Right Pool Size

The optimal pool size depends on your workload and server capacity:

```text
Rule of thumb:
  maxPoolSize = (number_of_CPUs * 2) + effective_spindle_count

For a 4-core server with SSD:
  maxPoolSize = (4 * 2) + 1 = ~10 per application instance

For a 16-core server with many short operations:
  maxPoolSize = 50-100 per application instance
```

Avoid setting `maxPoolSize` too high. Each connection consumes memory on the MongoDB server (~1MB per connection), and too many concurrent operations can cause contention on locks and working set memory.

## Monitoring Pool Usage

Check active connections from the application side:

```javascript
const client = new MongoClient(uri, { maxPoolSize: 50 });
client.on('connectionPoolCreated', (event) => console.log('Pool created'));
client.on('connectionCheckedOut', (event) => console.log('Connection checked out'));
client.on('connectionCheckedIn', (event) => console.log('Connection returned'));
```

From the MongoDB server side:

```javascript
// In mongosh
db.serverStatus().connections
// Output: { current: 12, available: 988, totalCreated: 45 }
```

## waitQueueTimeoutMS

When all connections are in use, new requests queue up. `waitQueueTimeoutMS` controls how long a request waits before throwing a timeout error:

```javascript
const client = new MongoClient(uri, {
  maxPoolSize: 10,
  waitQueueTimeoutMS: 3000, // throw error if no connection available in 3s
});
```

## Summary

Tune `maxPoolSize` based on your server's CPU and memory capacity, and set `minPoolSize` to a small value (2-10) to avoid cold-start latency after idle periods. Always monitor `db.serverStatus().connections` in production to detect pool exhaustion and adjust accordingly.
