# How to Handle Write Conflicts in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Conflict, Transaction, Concurrency, Error Handling

Description: Learn how to detect and handle write conflicts in MongoDB multi-document transactions with retry logic and best practices for concurrent writes.

---

## Introduction

Write conflicts in MongoDB occur during multi-document transactions when two operations attempt to modify the same document concurrently. MongoDB uses optimistic concurrency control - it detects conflicts when a conflicting write is attempted and throws a `WriteConflict` error (error code 112). Understanding how to handle these conflicts is essential for building reliable transactional applications.

## Understanding WriteConflict Errors

A `WriteConflict` error occurs when:

- Two transactions attempt to modify the same document simultaneously
- A transaction tries to write to a document that was modified outside the transaction after the transaction started

```text
MongoServerError: WriteConflict error: this operation conflicted with another operation.
Please retry your operation or multi-document transaction.
Error code: 112
```

## Basic Retry Pattern

The standard approach is to retry the transaction on `WriteConflict` and transient transaction errors:

```javascript
const { MongoClient } = require("mongodb");

async function runWithRetry(client, txnFunc) {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    const session = client.startSession();
    try {
      session.startTransaction({
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" }
      });

      await txnFunc(session);
      await session.commitTransaction();
      return;
    } catch (err) {
      await session.abortTransaction();

      const isRetryable =
        err.errorLabels &&
        (err.errorLabels.includes("TransientTransactionError") ||
          err.errorLabels.includes("UnknownTransactionCommitResult"));

      if (!isRetryable) throw err;

      attempt++;
      const backoff = Math.pow(2, attempt) * 50;
      await new Promise((r) => setTimeout(r, backoff));
    } finally {
      session.endSession();
    }
  }

  throw new Error(`Transaction failed after ${maxRetries} attempts`);
}
```

## Using the TransientTransactionError Label

MongoDB marks write conflicts with the `TransientTransactionError` label, which signals the operation is safe to retry:

```javascript
async function transferFunds(client, fromId, toId, amount) {
  await runWithRetry(client, async (session) => {
    const accounts = client.db("bank").collection("accounts");

    const from = await accounts.findOne({ _id: fromId }, { session });
    if (from.balance < amount) throw new Error("Insufficient funds");

    await accounts.updateOne(
      { _id: fromId },
      { $inc: { balance: -amount } },
      { session }
    );

    await accounts.updateOne(
      { _id: toId },
      { $inc: { balance: amount } },
      { session }
    );
  });
}
```

## Exponential Backoff Strategy

Implement exponential backoff to avoid thundering herd problems when many transactions conflict:

```javascript
function getBackoffMs(attempt, baseMs = 100, maxMs = 5000) {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseMs;
  return Math.min(exponential + jitter, maxMs);
}

async function retryTransaction(session, operation, maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      session.startTransaction();
      await operation(session);
      await session.commitTransaction();
      return;
    } catch (err) {
      await session.abortTransaction();
      if (
        err.errorLabels &&
        err.errorLabels.includes("TransientTransactionError") &&
        i < maxAttempts - 1
      ) {
        await new Promise((r) => setTimeout(r, getBackoffMs(i)));
        continue;
      }
      throw err;
    }
  }
}
```

## Minimizing Conflict Surface Area

Reduce write conflicts by minimizing transaction scope and duration:

```javascript
// BAD - Long-running transaction increases conflict window
async function badPattern(session, db) {
  session.startTransaction();
  const data = await db.collection("reports").find({}, { session }).toArray(); // Slow
  await processData(data); // External call - still in transaction
  await db.collection("summary").insertOne({ data }, { session });
  await session.commitTransaction();
}

// GOOD - Minimize work inside transaction
async function goodPattern(session, db) {
  const data = await db.collection("reports").find({}).toArray(); // Outside txn
  const summary = await processData(data); // Outside txn

  session.startTransaction();
  await db.collection("summary").insertOne({ summary }, { session });
  await session.commitTransaction();
}
```

## Detecting Conflict Metrics

Monitor write conflicts in your application logs and MongoDB server stats:

```javascript
// Check WiredTiger transaction statistics including conflicts
db.adminCommand({ serverStatus: 1 }).wiredTiger.transaction;

// Check operation metrics
db.adminCommand({ serverStatus: 1 }).metrics.document;
```

## Python Example with PyMongo

```python
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import time

def run_transaction_with_retry(txn_func, session):
    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            with session.start_transaction():
                txn_func(session)
            return
        except PyMongoError as exc:
            if exc.has_error_label("TransientTransactionError") and attempt < max_attempts - 1:
                time.sleep(0.1 * (2 ** attempt))
                continue
            raise
```

## Summary

Write conflicts are a normal part of MongoDB's optimistic concurrency model and should be handled with retry logic using the `TransientTransactionError` error label. Keep transactions short and focused, implement exponential backoff for retries, and move non-transactional work outside transaction boundaries to minimize conflict frequency. Monitoring server metrics for write conflict rates can help identify hot spots in your data access patterns.
