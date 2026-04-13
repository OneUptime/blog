# How to Handle Write Conflict Retries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Conflict, Transaction, Error Handling, Retry Logic

Description: Learn how to detect and retry MongoDB write conflicts and transient transaction errors using proper retry loops in Node.js and Python applications.

---

## What Are Write Conflicts

A write conflict occurs when two concurrent operations attempt to modify the same document and MongoDB's optimistic locking mechanism detects the conflict. This is most common in:
- Multi-document transactions
- Highly concurrent document updates
- WiredTiger storage engine's document-level locking

Write conflicts return error code `112` (`WriteConflict`). Transient transaction errors that should be retried include codes `112`, `251` (NoSuchTransaction), and `225` (TransactionTooOld).

## Identifying Write Conflict Errors

```javascript
// Error code 112 - WriteConflict
// Error code 251 - NoSuchTransaction
// Error code 225 - TransactionTooOld
// Error label "TransientTransactionError" - indicates safe to retry entire transaction
// Error label "UnknownTransactionCommitResult" - indicates safe to retry commit only
```

## Implementing a Retry Loop for Transactions in Node.js

```javascript
const { MongoClient } = require("mongodb");

const TRANSIENT_LABELS = new Set(["TransientTransactionError"]);
const COMMIT_LABELS = new Set(["UnknownTransactionCommitResult"]);
const MAX_RETRIES = 3;

async function withTransactionRetry(client, txnFn) {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    const session = client.startSession();
    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" }
    });

    try {
      await txnFn(session);

      // Retry commit if UnknownTransactionCommitResult
      let commitAttempt = 0;
      while (commitAttempt < MAX_RETRIES) {
        try {
          await session.commitTransaction();
          return; // success
        } catch (commitErr) {
          if (hasLabel(commitErr, COMMIT_LABELS)) {
            commitAttempt++;
            continue;
          }
          throw commitErr;
        }
      }
      throw new Error("Transaction commit failed after max retries");
    } catch (err) {
      await session.abortTransaction();
      if (hasLabel(err, TRANSIENT_LABELS) || err.code === 112) {
        attempt++;
        await sleep(50 * Math.pow(2, attempt)); // exponential backoff
        continue;
      }
      throw err;
    } finally {
      session.endSession();
    }
  }

  throw new Error(`Transaction failed after ${MAX_RETRIES} attempts`);
}

function hasLabel(err, labelSet) {
  return (err.errorLabels || []).some(label => labelSet.has(label));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

Using the retry helper:

```javascript
const client = new MongoClient("mongodb://localhost:27017/?replicaSet=rs0");
await client.connect();

const db = client.db("banking");
const accounts = db.collection("accounts");

await withTransactionRetry(client, async (session) => {
  await accounts.updateOne(
    { _id: "ACC-001", balance: { $gte: 100 } },
    { $inc: { balance: -100 } },
    { session }
  );
  await accounts.updateOne(
    { _id: "ACC-002" },
    { $inc: { balance: 100 } },
    { session }
  );
});
```

## Retry Logic in Python

```python
import time
from pymongo import MongoClient
from pymongo.errors import PyMongoError

MAX_RETRIES = 3
TRANSIENT_LABEL = "TransientTransactionError"
COMMIT_LABEL = "UnknownTransactionCommitResult"

def run_with_retry(client, txn_fn):
    for attempt in range(MAX_RETRIES):
        with client.start_session() as session:
            try:
                with session.start_transaction():
                    txn_fn(session)
                    # Commit handled automatically by context manager
                return
            except PyMongoError as e:
                if e.has_error_label(TRANSIENT_LABEL) or getattr(e, 'code', None) == 112:
                    time.sleep(0.05 * (attempt + 1))
                    continue
                raise
    raise RuntimeError(f"Transaction failed after {MAX_RETRIES} attempts")
```

## Handling Write Conflicts Outside Transactions

For non-transactional updates with optimistic locking using a version field:

```javascript
async function updateWithOptimisticLock(collection, docId, updateFn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const doc = await collection.findOne({ _id: docId });
    if (!doc) throw new Error("Document not found");

    const updates = updateFn(doc);
    const result = await collection.updateOne(
      { _id: docId, __v: doc.__v },  // version check
      { $set: updates, $inc: { __v: 1 } }
    );

    if (result.matchedCount === 1) return; // success
    // version mismatch - another process modified the doc - retry
    await new Promise(r => setTimeout(r, 10 * (i + 1)));
  }
  throw new Error("Optimistic lock failed: too many retries");
}
```

## Backoff Strategy

Avoid fixed-interval retries. Use exponential backoff with jitter to prevent thundering herd:

```javascript
function backoffMs(attempt) {
  const base = 50; // ms
  const jitter = Math.random() * 50;
  return Math.min(base * Math.pow(2, attempt) + jitter, 2000);
}
```

## Summary

Write conflicts in MongoDB occur when concurrent operations modify the same document and are indicated by error code 112 or the `TransientTransactionError` label. The correct response is always to abort and retry the entire transaction, not just the failing operation. Implement an exponential backoff retry loop, limit retries to a reasonable maximum (3-5 attempts), and distinguish between transient errors (safe to retry) and permanent errors (should be propagated to the caller).
