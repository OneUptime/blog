# How to Configure Connection Retry Logic in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Retry, Connection, Resilience, Driver

Description: Learn how to configure retryable writes and reads in MongoDB and implement application-level retry logic with exponential backoff for connection failures.

---

## Overview

MongoDB drivers support retryable writes since version 3.6 and retryable reads since version 4.2, which automatically retry certain operations once on transient network errors. For deeper resilience, you can also implement application-level retry loops with exponential backoff.

## Enabling Retryable Writes and Reads

Retryable writes are enabled by default in MongoDB drivers 4.2+. You can also set them explicitly in the connection string:

```bash
mongodb://localhost:27017/mydb?retryWrites=true&retryReads=true
```

Or in the driver options:

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017", {
  retryWrites: true,
  retryReads: true
});
```

## What Operations Are Retried

Retryable writes cover: `insertOne`, `insertMany`, `updateOne`, `replaceOne`, `deleteOne`, `findOneAndUpdate`, `findOneAndReplace`, `findOneAndDelete`, and bulk write operations. Retryable reads cover most read operations.

Multi-document transactions, `insertMany` with unordered writes, and `mapReduce` are not retried automatically.

## Application-Level Retry with Exponential Backoff

For operations that fall outside the built-in retry scope, implement your own retry logic:

```javascript
async function withRetry(operation, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const isTransient =
        err.name === "MongoNetworkError" ||
        err.name === "MongoServerSelectionError" ||
        (err.code && [6, 7, 89, 91, 189, 262, 9001].includes(err.code));

      if (isTransient && attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
        console.warn(`Attempt ${attempt} failed, retrying in ${delay.toFixed(0)}ms`);
        await new Promise(r => setTimeout(r, delay));
        lastError = err;
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

// Usage
const doc = await withRetry(() =>
  collection.findOne({ _id: targetId })
);
```

## Python Retry Implementation

```python
import time
import random
from pymongo.errors import (
    AutoReconnect,
    NetworkTimeout,
    ServerSelectionTimeoutError
)

def with_retry(operation, max_attempts=3):
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            return operation()
        except (AutoReconnect, NetworkTimeout, ServerSelectionTimeoutError) as e:
            if attempt < max_attempts:
                delay = (2 ** attempt) * 0.1 + random.random() * 0.1
                print(f"Attempt {attempt} failed, retrying in {delay:.2f}s")
                time.sleep(delay)
                last_error = e
            else:
                raise
    raise last_error

# Usage
result = with_retry(lambda: collection.find_one({"_id": target_id}))
```

## Configuring Initial Connection Retry

For the initial connection to MongoDB at application startup, use a retry loop to handle the case where MongoDB is not yet ready:

```javascript
async function connectWithRetry(uri, maxAttempts = 10) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await client.connect();
      console.log("Connected to MongoDB");
      return client;
    } catch (err) {
      console.warn(`Connection attempt ${i}/${maxAttempts} failed: ${err.message}`);
      if (i < maxAttempts) await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error("Could not connect to MongoDB after max attempts");
}
```

## Summary

MongoDB's built-in retryable writes and reads cover most transient network errors automatically. For operations outside the retry scope, implement exponential backoff with jitter to avoid thundering herd problems. At startup, wrap the initial connection in a retry loop to gracefully handle delayed MongoDB availability in containerized environments.
