# How to Configure Retry Behavior in MongoDB Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Driver, Retry, Configuration, Connection

Description: Learn how to configure retryWrites and retryReads behavior in MongoDB drivers across Node.js, Python, and Java for production-ready resilience.

---

## Driver-Level Retry Configuration

MongoDB drivers expose two primary retry knobs: `retryWrites` and `retryReads`. Both are enabled by default in modern driver versions, but understanding their exact behavior and how to tune related options helps you build more resilient applications.

## Node.js Driver Configuration

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017', {
  // Retry eligible write operations once on transient errors
  retryWrites: true,

  // Retry eligible read operations once on transient errors
  retryReads: true,

  // How long to wait to find an available server before error
  serverSelectionTimeoutMS: 5000,

  // How long to wait for a connection to be established
  connectTimeoutMS: 10000,

  // How long to wait for a socket response
  socketTimeoutMS: 45000,
});
```

## PyMongo Configuration

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    retryWrites=True,
    retryReads=True,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=45000,
)
```

## Java Driver Configuration

```java
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClients;
import java.util.concurrent.TimeUnit;

MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
    .retryWrites(true)
    .retryReads(true)
    .applyToSocketSettings(builder ->
        builder.connectTimeout(10, TimeUnit.SECONDS)
               .readTimeout(45, TimeUnit.SECONDS))
    .applyToClusterSettings(builder ->
        builder.serverSelectionTimeout(5, TimeUnit.SECONDS))
    .build();

MongoClient client = MongoClients.create(settings);
```

## Via Connection String

Both options can be set in the connection string directly:

```text
mongodb://user:pass@host:27017/mydb?retryWrites=true&retryReads=true&serverSelectionTimeoutMS=5000
```

## What Gets Retried

Not all operations qualify for automatic retries. The driver only retries once on specific transient error codes:

```text
Retryable writes:
- insertOne, insertMany (ordered)
- updateOne, replaceOne
- deleteOne
- findOneAndUpdate, findOneAndReplace, findOneAndDelete
- bulkWrite (if not using unordered batch)

NOT retried:
- insertMany (unordered)
- updateMany, deleteMany
- any write inside a transaction
```

## Checking if a Write Was Retried

Some drivers expose retry information in the result or through APM events:

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(uri, { retryWrites: true, monitorCommands: true });

client.on('commandSucceeded', (event) => {
  // Log commands that succeeded - useful to detect retried ops
  if (event.commandName === 'insert') {
    console.log(`Insert took ${event.duration}ms`);
  }
});
```

## Disabling Retries for Specific Use Cases

For idempotency-sensitive workflows where a retry could cause unintended duplicates (non-idempotent operations), you may want to disable retries:

```javascript
// Disable retries for a specific client used in batch processing
const batchClient = new MongoClient(uri, {
  retryWrites: false,
  retryReads: false,
});
```

## Summary

Configuring retry behavior in MongoDB drivers is straightforward and should be part of every production client setup. Enable both `retryWrites` and `retryReads`, tune the timeout values to match your network conditions, and understand which operations are and are not automatically retried. For operations not covered by driver-level retries, implement custom retry logic with exponential backoff.
