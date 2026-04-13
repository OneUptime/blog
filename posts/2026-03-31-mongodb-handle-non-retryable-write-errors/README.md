# How to Handle Non-Retryable Write Errors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Error Handling, Write Error, Driver, Resilience

Description: Learn how to identify and handle non-retryable write errors in MongoDB to build robust applications that respond correctly to permanent failures.

---

## Understanding Non-Retryable Write Errors

MongoDB classifies write errors into two categories: retryable (transient network issues, elections) and non-retryable (permanent failures like duplicate key violations or schema validation errors). Non-retryable errors must be handled explicitly in application code because the driver will not attempt a second try.

## Common Non-Retryable Write Errors

```text
- DuplicateKey (code 11000): unique index violation
- WriteConflict (code 112): concurrent transaction conflict
- DocumentValidationFailure (code 121): schema validation failed
- MaxTimeMSExpired (code 50): operation exceeded time limit
- BulkWriteError: one or more operations in a bulk write failed
- Unauthorized (code 13): missing permissions
```

## Detecting Non-Retryable Errors in Node.js

```javascript
const { MongoClient, MongoServerError } = require('mongodb');

async function insertUser(db, user) {
  try {
    await db.collection('users').insertOne(user);
    console.log('Insert successful');
  } catch (err) {
    if (err instanceof MongoServerError) {
      if (err.code === 11000) {
        // Non-retryable: duplicate key - handle gracefully
        console.error('User already exists:', err.keyValue);
        return { error: 'duplicate', field: err.keyValue };
      }
      if (err.code === 121) {
        // Non-retryable: document failed schema validation
        console.error('Validation failed:', err.errInfo);
        return { error: 'validation', details: err.errInfo };
      }
    }
    throw err; // re-throw unexpected errors
  }
}
```

## Handling Errors in PyMongo

```python
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, WriteError, OperationFailure

client = MongoClient("mongodb://localhost:27017")
db = client["myapp"]

def insert_user(user):
    try:
        db.users.insert_one(user)
    except DuplicateKeyError as e:
        # Non-retryable: handle permanent conflict
        print(f"Duplicate key error: {e.details}")
        return {"error": "duplicate"}
    except WriteError as e:
        if e.code == 121:
            print(f"Schema validation failed: {e.details}")
            return {"error": "validation"}
        raise
    except OperationFailure as e:
        print(f"Operation failed with code {e.code}: {e.details}")
        raise
```

## Handling Bulk Write Errors

Bulk writes can partially succeed. Always inspect the `BulkWriteError` to determine which operations failed:

```javascript
const { MongoBulkWriteError } = require('mongodb');

async function bulkInsert(collection, documents) {
  try {
    const result = await collection.insertMany(documents, { ordered: false });
    console.log(`Inserted: ${result.insertedCount}`);
  } catch (err) {
    if (err instanceof MongoBulkWriteError) {
      console.log(`Inserted: ${err.result.insertedCount}`);
      for (const writeError of err.writeErrors) {
        console.error(`Doc ${writeError.index} failed: ${writeError.errmsg}`);
      }
    } else {
      throw err;
    }
  }
}
```

## Differentiating Retryable vs Non-Retryable at Runtime

```javascript
function isRetryableError(err) {
  // Retryable error codes per MongoDB spec
  const retryableCodes = new Set([6, 7, 89, 91, 189, 9001, 10107, 11600, 11602, 13435, 13436, 262]);
  return retryableCodes.has(err.code) || err.hasErrorLabel?.('RetryableWriteError');
}

async function writeWithHandling(collection, doc) {
  try {
    await collection.insertOne(doc);
  } catch (err) {
    if (isRetryableError(err)) {
      console.log('Transient error - safe to retry');
    } else {
      console.error('Permanent error - do not retry:', err.message);
    }
  }
}
```

## Summary

Non-retryable write errors represent permanent failures that require explicit application-level handling. Always catch `MongoServerError` and inspect the `code` field to route errors appropriately - whether returning a user-facing error, logging for alerting, or applying compensating logic. Never blindly retry operations that fail with non-retryable codes, as this wastes resources and may cause data inconsistency.
