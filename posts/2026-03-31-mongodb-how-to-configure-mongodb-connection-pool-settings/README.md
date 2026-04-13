# How to Configure MongoDB Connection Pool Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Pooling, Performance, Application Development

Description: Learn how to configure MongoDB connection pool settings in drivers and server configuration to optimize database performance and prevent connection exhaustion.

---

## Overview

Connection pooling is a technique that reuses database connections rather than creating a new connection for every database operation. MongoDB drivers maintain a pool of connections that applications can borrow and return. Proper connection pool configuration is critical for application performance and preventing connection exhaustion.

## How Connection Pooling Works

When an application starts, the driver creates an initial number of connections. As the application makes requests, it borrows connections from the pool. After each operation, the connection is returned to the pool for reuse. If all connections are in use and a new request arrives, it either waits or fails depending on configuration.

```text
Application -> Driver Pool (min: 5, max: 100) -> MongoDB Server
                 [conn1][conn2][conn3][conn4][conn5]
```

## Server-Side Connection Limits

Configure the maximum number of connections the server accepts:

```yaml
# /etc/mongod.conf
net:
  maxIncomingConnections: 65536
```

Check current connection usage:

```javascript
db.serverStatus().connections
// { current: 42, available: 819158, totalCreated: 15823 }
```

## Driver Connection Pool Configuration

### Node.js (mongodb driver)

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017/mydb', {
  // Maximum number of connections in the pool
  maxPoolSize: 100,
  
  // Minimum number of connections maintained in the pool
  minPoolSize: 10,
  
  // Maximum time (ms) a thread waits for a connection from the pool
  waitQueueTimeoutMS: 5000,
  
  // Maximum time (ms) a connection can remain idle before being closed
  maxIdleTimeMS: 30000,
  
  // Connection timeout in milliseconds
  connectTimeoutMS: 10000,
  
  // Socket timeout in milliseconds
  socketTimeoutMS: 45000
});
```

### Python (pymongo)

```python
from pymongo import MongoClient

client = MongoClient(
    'mongodb://localhost:27017/',
    # Maximum number of connections in the pool
    maxPoolSize=100,
    # Minimum number of connections maintained
    minPoolSize=10,
    # Maximum time (ms) a thread waits for a connection
    waitQueueTimeoutMS=5000,
    # Maximum time (ms) a connection can remain idle
    maxIdleTimeMS=30000,
    # Connection timeout in milliseconds
    connectTimeoutMS=10000,
    # Socket timeout
    socketTimeoutMS=45000
)
```

### Java (mongodb-driver-sync)

```java
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import java.util.concurrent.TimeUnit;

MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
    .applyToConnectionPoolSettings(builder -> builder
        .maxSize(100)
        .minSize(10)
        .maxWaitTime(5000, TimeUnit.MILLISECONDS)
        .maxConnectionIdleTime(30000, TimeUnit.MILLISECONDS)
        .maxConnectionLifeTime(0, TimeUnit.MILLISECONDS)
    )
    .build();

MongoClient client = MongoClients.create(settings);
```

### Go (mongo-driver)

```go
import (
    "context"
    "time"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

ctx := context.Background()
maxPool := uint64(100)
minPool := uint64(10)
maxIdleTime := 30 * time.Second

clientOptions := options.Client().
    ApplyURI("mongodb://localhost:27017").
    SetMaxPoolSize(maxPool).
    SetMinPoolSize(minPool).
    SetMaxConnIdleTime(maxIdleTime)

client, err := mongo.Connect(ctx, clientOptions)
```

## Monitoring Connection Pool Health

```javascript
// Check connection pool status via serverStatus
let connStatus = db.serverStatus().connections;
print("Current connections:", connStatus.current);
print("Available connections:", connStatus.available);
print("Total created:", connStatus.totalCreated);
print("Active:", connStatus.active);
```

## Connection Pool Sizing Guidelines

The right pool size depends on your workload:

```text
Rule of thumb: maxPoolSize = (number of CPU cores) * 2 + 1

Example for a 4-core server: maxPoolSize = 9-10
Example for a 16-core server: maxPoolSize = 33-35
```

For web applications with many concurrent users:

```javascript
// Calculate based on expected concurrent users and operation duration
// If 100 concurrent requests each hold a connection for 100ms
// Pool size needed = 100 * (100ms / 1000ms) = 10 connections

const poolSize = Math.ceil(
  (expectedConcurrentRequests * avgOperationDurationMs) / 1000
);
```

## Handling Connection Pool Exhaustion

When the pool is exhausted and `waitQueueTimeoutMS` expires, you get an error:

```javascript
// Error: connection pool timed out when trying to check out a connection
// Handle this in application code:

async function withRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (err) {
      if (err.message.includes('connection pool') && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}
```

## Summary

MongoDB connection pool settings control how many connections are maintained between your application and the database. Setting `maxPoolSize` too low causes connection exhaustion under load; setting it too high wastes server resources. The optimal pool size depends on your hardware, application concurrency, and operation duration. Monitor `db.serverStatus().connections` regularly to verify that pool configuration is appropriate for your workload.
