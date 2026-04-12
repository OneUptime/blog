# How to Use the retryWrites and retryReads Options in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Retry, Connection String, Resilience, Driver

Description: Learn how to configure retryWrites and retryReads in MongoDB connection strings to automatically recover from transient network errors and replica set elections.

---

## Overview

`retryWrites` and `retryReads` are connection string options that instruct the MongoDB driver to automatically retry specific operations once when they encounter a transient error. Both are enabled by default in modern drivers, but understanding their semantics helps you configure them correctly.

## Connection String Format

```text
mongodb://user:pass@host:27017/mydb?retryWrites=true&retryReads=true
```

For MongoDB Atlas, these are already included in the default connection string:

```text
mongodb+srv://user:pass@cluster.mongodb.net/mydb?retryWrites=true&w=majority
```

## Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017', {
  retryWrites: true,
  retryReads: true,
});
```

## PyMongo

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    retryWrites=True,
    retryReads=True,
)
```

## What retryWrites Covers

`retryWrites=true` enables automatic retry for individual write operations that encounter a transient error:

```text
Covered by retryWrites:
  insertOne, insertMany
  updateOne, replaceOne
  deleteOne
  findOneAndUpdate, findOneAndReplace, findOneAndDelete
  bulkWrite (when containing only single-document write operations)

NOT covered:
  updateMany, deleteMany
  writes inside a transaction (use withTransaction() instead)
```

## What retryReads Covers

`retryReads=true` enables automatic retry for read operations:

```text
Covered by retryReads:
  find, findOne
  aggregate (read-only pipelines)
  distinct, count, countDocuments
  listCollections, listDatabases

NOT covered:
  getMore (cursor iteration after the first batch)
```

## Retry Behavior

The driver retries exactly once. It does not implement exponential backoff. If the retry also fails, the error is propagated to the application:

```javascript
// Both of these are equivalent in behavior for transient errors
const result = await collection.findOne({ _id: userId });

// The above is automatically retried once if a transient error occurs
// No code change needed - handled by the driver
```

## When to Disable retryWrites

Disable `retryWrites` only if your write operations are not idempotent and a duplicate could cause data corruption. In practice, MongoDB driver retries use session IDs to make retries idempotent on the server side, so this is rarely needed:

```javascript
// Disable only for non-idempotent multi-statement workflows
// where you manage idempotency yourself
const client = new MongoClient(uri, {
  retryWrites: false,
  retryReads: true,
});
```

## Combining with serverSelectionTimeoutMS

For complete resilience configuration, combine retry options with appropriate timeouts:

```javascript
const client = new MongoClient(uri, {
  retryWrites: true,
  retryReads: true,
  serverSelectionTimeoutMS: 5000,  // fail fast if no server available
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
});
```

## Summary

Enable both `retryWrites=true` and `retryReads=true` in all production MongoDB connection strings. Modern drivers default to both being enabled, but explicitly setting them makes the configuration intent clear. The driver handles transient network errors and replica set elections transparently - no application code changes required. For operations not covered by driver retries (like `updateMany`), implement custom retry logic with exponential backoff.
