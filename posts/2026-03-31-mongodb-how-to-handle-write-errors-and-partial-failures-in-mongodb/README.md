# How to Handle Write Errors and Partial Failures in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Error Handling, Bulk Write, Partial Failure, Write Error

Description: Learn how to detect, handle, and recover from write errors and partial failures in MongoDB bulk operations and single writes.

---

## Types of Write Errors in MongoDB

MongoDB write errors fall into several categories:

- **Duplicate key errors** (code 11000) - unique index constraint violated
- **Document validation errors** (code 121) - schema validation failed
- **Write concern errors** - insufficient replicas acknowledged the write
- **Network errors** - connection lost before acknowledgment
- **BulkWriteError** - one or more operations in a bulk write failed

## Handling Single Write Errors

For single writes, catch exceptions and inspect the error code:

```javascript
// Node.js example
try {
  await db.collection("users").insertOne({
    _id: "user@example.com",
    name: "Alice"
  })
} catch (err) {
  if (err.code === 11000) {
    console.error("Duplicate key:", err.keyValue)
    // handle duplicate: skip, update, or notify
  } else if (err.code === 121) {
    console.error("Validation failed:", err.errInfo)
  } else {
    throw err  // re-throw unexpected errors
  }
}
```

```python
# Python/PyMongo example
from pymongo.errors import DuplicateKeyError, WriteError

try:
    collection.insert_one({"_id": "alice@example.com", "name": "Alice"})
except DuplicateKeyError as e:
    print(f"Duplicate: {e.details}")
except WriteError as e:
    print(f"Write error code {e.code}: {e}")
```

## Handling Ordered Bulk Write Failures

In ordered mode, the batch stops at the first error. The exception tells you the index where failure occurred:

```javascript
try {
  const result = await db.collection("items").bulkWrite([
    { insertOne: { document: { _id: 1, name: "A" } } },  // index 0
    { insertOne: { document: { _id: 2, name: "B" } } },  // index 1 - may fail
    { insertOne: { document: { _id: 3, name: "C" } } }   // index 2 - skipped if 1 fails
  ], { ordered: true })
} catch (err) {
  if (err.name === "MongoBulkWriteError") {
    console.log("Failed at index:", err.writeErrors[0].index)
    console.log("Succeeded before failure:", err.result.insertedCount)
    // Retry from err.index + 1 if needed
  }
}
```

## Handling Unordered Bulk Write Failures

In unordered mode, all operations run. Errors are collected in `writeErrors`:

```javascript
try {
  const result = await db.collection("products").bulkWrite(operations, { ordered: false })
  console.log("All succeeded:", result.insertedCount)
} catch (err) {
  if (err.name === "MongoBulkWriteError") {
    console.log("Some operations failed:")
    err.writeErrors.forEach(writeErr => {
      console.log(` - Index ${writeErr.index}: code ${writeErr.code} - ${writeErr.errmsg}`)
    })

    // Count what succeeded
    console.log("Inserted:", err.result.insertedCount)
    console.log("Modified:", err.result.modifiedCount)
    console.log("Deleted:", err.result.deletedCount)

    // Identify failed document IDs for retry or logging
    const failedIndexes = new Set(err.writeErrors.map(e => e.index))
    const failedOps = operations.filter((_, i) => failedIndexes.has(i))
    console.log("Failed operations:", failedOps.length)
  }
}
```

## Partial Failure Recovery Pattern

Build a retry mechanism for transient failures:

```javascript
async function bulkWriteWithRetry(collection, operations, maxRetries = 3) {
  let attempt = 0
  let pendingOps = [...operations]

  while (attempt < maxRetries && pendingOps.length > 0) {
    try {
      await collection.bulkWrite(pendingOps, { ordered: false })
      return  // all succeeded
    } catch (err) {
      if (err.name !== "MongoBulkWriteError") throw err

      // Separate permanent errors (duplicate key) from transient ones
      const retryableOps = []
      const permanentErrors = []

      err.writeErrors.forEach(writeErr => {
        if (writeErr.code === 11000) {
          // Duplicate key - permanent, skip
          permanentErrors.push(writeErr)
        } else {
          // Transient - retry
          retryableOps.push(pendingOps[writeErr.index])
        }
      })

      if (permanentErrors.length > 0) {
        console.warn(`${permanentErrors.length} permanent errors (duplicates), skipping`)
      }

      pendingOps = retryableOps
      attempt++

      if (pendingOps.length > 0 && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt))
      }
    }
  }

  if (pendingOps.length > 0) {
    throw new Error(`${pendingOps.length} operations failed after ${maxRetries} retries`)
  }
}
```

## Write Concern Errors

Write concern errors mean the write succeeded on the primary but was not replicated to enough secondaries:

```javascript
try {
  await db.collection("critical").insertOne(
    { data: "important" },
    { writeConcern: { w: "majority", wtimeout: 5000 } }
  )
} catch (err) {
  if (err.name === "MongoWriteConcernError") {
    console.error("Replication not confirmed within timeout")
    // The write may have succeeded - check if document exists
    const existing = await db.collection("critical").findOne({ data: "important" })
    if (existing) {
      console.log("Write succeeded but acknowledgment timed out")
    }
  }
}
```

## Logging Failed Operations

Always log write failures for auditing:

```javascript
async function logWriteError(collection, operation, error) {
  await db.collection("writeErrorLog").insertOne({
    collection,
    operation,
    errorCode: error.code,
    errorMessage: error.message,
    timestamp: new Date(),
    retryCount: 0
  })
}
```

## Summary

MongoDB write errors include duplicate key violations, validation failures, write concern timeouts, and network errors. For bulk writes, unordered mode collects all errors in `writeErrors` while ordered mode stops at the first failure. Build robust handlers that separate permanent errors like duplicates from transient errors worth retrying, and always log failures with enough context to investigate or replay them.
