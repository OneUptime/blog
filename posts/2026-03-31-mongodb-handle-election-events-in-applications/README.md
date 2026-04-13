# How to Handle Election Events in MongoDB Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Election, Driver, Retry, Resilience

Description: Learn how to handle MongoDB replica set election events in application code using retryable writes, SDAM events, and connection management best practices.

---

## Why Application Code Must Handle Elections

When a MongoDB replica set election occurs, the current primary steps down and a new one is elected. During this window - typically a few seconds - write operations to the old primary will fail with a `NotPrimaryError` or `NotMaster` error. Applications that don't handle this gracefully will surface errors to end users or lose data.

Modern MongoDB drivers provide mechanisms to absorb these transient failures transparently.

## Retryable Writes

The simplest defense is enabling retryable writes, which is on by default in MongoDB drivers since version 4.2+. With retryable writes enabled, the driver automatically retries eligible write operations once after a transient network or primary-election failure.

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://mongo1:27017,mongo2:27017,mongo3:27017/mydb?replicaSet=rs0", {
  retryWrites: true,
  retryReads: true
});
```

Retryable writes cover single-document operations such as `insertOne`, `updateOne`, `deleteOne`, `findOneAndUpdate`, and `findOneAndDelete`. Multi-document writes with `insertMany` and `bulkWrite` (when composed of single-document operations) are also retryable.

## Listening to SDAM Events

The Server Discovery and Monitoring (SDAM) events emitted by the driver let your application react to topology changes including elections:

```javascript
const client = new MongoClient(uri);

client.on("serverDescriptionChanged", (event) => {
  const { previousDescription, newDescription } = event;
  if (previousDescription.type === "RSPrimary" && newDescription.type !== "RSPrimary") {
    console.warn("Primary stepped down, election in progress");
    // Trigger alerting or circuit breaker logic
  }
});

client.on("topologyDescriptionChanged", (event) => {
  const { newDescription } = event;
  const hasPrimary = Array.from(newDescription.servers.values()).some(
    (s) => s.type === "RSPrimary"
  );
  if (!hasPrimary) {
    console.warn("No primary available - replica set election underway");
  }
});
```

## Handling Errors Explicitly

Even with retryable writes, some operations - such as multi-document transactions or operations that exceed the retry window - will surface errors. Wrap critical write paths with explicit error handling:

```javascript
async function safeInsert(collection, document) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await collection.insertOne(document);
    } catch (err) {
      const isElectionError =
        err.code === 10107 || // NotPrimary
        err.code === 91 ||    // ShutdownInProgress
        err.message?.includes("not primary");
      if (isElectionError && attempt < maxRetries) {
        const delay = attempt * 500;
        console.warn(`Election detected, retrying in ${delay}ms (attempt ${attempt})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}
```

## Configuring Server Selection Timeout

If no primary is available during an election, the driver will wait up to `serverSelectionTimeoutMS` before throwing an error. Tune this to balance user experience against resilience:

```javascript
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 15000, // wait up to 15 seconds for a primary
  retryWrites: true
});
```

## Python Example with PyMongo

```python
from pymongo import MongoClient
from pymongo.errors import NotPrimaryError, ConnectionFailure
import time

client = MongoClient(
    "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0",
    serverSelectionTimeoutMS=15000,
    retryWrites=True
)

def safe_insert(collection, document, retries=3):
    for attempt in range(1, retries + 1):
        try:
            return collection.insert_one(document)
        except (NotPrimaryError, ConnectionFailure) as e:
            if attempt < retries:
                time.sleep(attempt * 0.5)
            else:
                raise
```

## Summary

MongoDB applications should handle replica set election events using retryable writes, SDAM event listeners for observability, explicit error handling for `NotPrimaryError` codes, and appropriate `serverSelectionTimeoutMS` tuning. Combining these strategies ensures election events cause minimal disruption to end users and that no writes are silently lost during primary failover.
