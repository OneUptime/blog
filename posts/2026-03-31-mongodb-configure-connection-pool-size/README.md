# How to Configure Connection Pool Size in MongoDB Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Pool, Performance, Driver, Configuration

Description: Configure optimal MongoDB driver connection pool size to balance resource usage and throughput, covering Node.js, Python, Java, and Go drivers.

---

## Why Connection Pool Size Matters

MongoDB drivers maintain a pool of persistent TCP connections to the server. The pool size determines how many concurrent operations can execute without waiting for a connection. Setting it too low creates bottlenecks; setting it too high wastes server resources and can exceed MongoDB's connection limits.

## MongoDB's Connection Limit

Each mongod process has a default connection limit derived from ulimit:

```bash
# Check current connection usage
mongosh --eval "db.serverStatus().connections"

# Server-side: check maxIncomingConnections
mongosh --eval "db.adminCommand({getParameter: 1, maxIncomingConnections: 1})"
```

The default `maxIncomingConnections` is 65,536 but actual limits depend on OS `ulimit -n` settings.

## Node.js Driver Configuration

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017", {
  maxPoolSize: 50,          // Max connections in pool (default: 100)
  minPoolSize: 5,           // Min connections kept alive (default: 0)
  maxIdleTimeMS: 30000,     // Close connections idle for 30s
  waitQueueTimeoutMS: 5000  // Timeout waiting for a free connection
});

await client.connect();
```

## Python PyMongo Configuration

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    maxPoolSize=50,           # Max connections (default: 100)
    minPoolSize=5,            # Min connections maintained
    maxIdleTimeMS=30000,      # Close idle connections after 30s
    waitQueueTimeoutMS=5000   # Timeout for waiting on pool
)
```

## Java Driver Configuration

```java
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClients;

MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
    .applyToConnectionPoolSettings(builder ->
        builder
            .maxSize(50)
            .minSize(5)
            .maxWaitTime(5, TimeUnit.SECONDS)
            .maxConnectionIdleTime(30, TimeUnit.SECONDS)
    )
    .build();

MongoClient client = MongoClients.create(settings);
```

## Go Driver Configuration

```go
import (
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

maxPoolSize := uint64(50)
minPoolSize := uint64(5)
maxIdleTime := 30 * time.Second

opts := options.Client().
    ApplyURI("mongodb://localhost:27017").
    SetMaxPoolSize(maxPoolSize).
    SetMinPoolSize(minPoolSize).
    SetMaxConnIdleTime(maxIdleTime)

client, err := mongo.Connect(ctx, opts)
```

## Sizing Guidelines

```text
Workload Type           | Recommended maxPoolSize
------------------------|------------------------
Low traffic API         | 10-25
Medium web application  | 25-100
High throughput service | 100-200
Background batch job    | 5-10
```

Calculate the safe total: `total_connections = num_app_instances * maxPoolSize`

Ensure this stays well below MongoDB's `maxIncomingConnections` and within ulimit constraints.

## Monitoring Pool Usage

```javascript
// Node.js: listen for pool events
client.on("connectionPoolCreated", (event) => {
  console.log("Pool created:", event);
});

client.on("connectionCheckedOut", (event) => {
  // A connection was taken from the pool
});

client.on("connectionPoolCleared", (event) => {
  console.warn("Pool cleared - connections were reset");
});
```

## Summary

MongoDB driver connection pool size is configured via `maxPoolSize` (upper bound) and `minPoolSize` (pre-warmed connections). The optimal `maxPoolSize` depends on your concurrency needs and the number of application instances connecting to MongoDB. Multiply `maxPoolSize` by instance count to estimate total server connections, and ensure that total stays within MongoDB's server-side connection limits. Monitor pool events to detect exhaustion (`waitQueueTimeoutMS` errors) or under-utilization.
