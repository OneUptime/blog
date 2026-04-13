# How to Fix MongoError: Killed by Server During Operation in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Killed Operation, Server, Timeout, Administration

Description: Learn why MongoDB kills operations and how to fix it by identifying kill sources, tuning operation time limits, and optimizing long-running queries.

---

## Understanding the Error

`MongoError: server killed the operation` or `MongoNetworkError: connection was forcefully closed` means MongoDB's server explicitly terminated an in-progress operation. This is different from a network timeout - the server is actively killing the operation.

```text
MongoServerError: operation was interrupted
    code: 11601, codeName: 'Interrupted'
```

```text
MongoServerError: operation was interrupted due to: MaxTimeMSExpired
    code: 50
```

## Common Kill Triggers

### 1. Admin Killed the Operation

A database administrator ran `db.killOp()` or used Atlas's "Kill Session" feature:

```javascript
// Administrators can kill operations
db.adminCommand({ killOp: 1, op: 12345 })
```

Check with your DBA team if operations are being killed intentionally (e.g., runaway queries).

### 2. maxTimeMS Timeout

The operation exceeded its `maxTimeMS` limit. See the `MaxTimeMSExpired` fix - add indexes and optimize the query:

```javascript
// The query timed out - add an index or increase the limit
await db.collection('events').createIndex({ userId: 1, timestamp: -1 });
```

### 3. Server Shutdown or Restart

During a planned or unplanned `mongod` restart, all in-flight operations are killed:

```text
MongoServerError: interrupted at shutdown
    code: 11600, codeName: 'InterruptedAtShutdown'
```

Use retryable writes to automatically replay these after the server comes back:

```javascript
const client = new MongoClient(uri, { retryWrites: true, retryReads: true });
```

### 4. Cursor Timeout

Idle cursors are killed by the server after `cursorTimeoutMillis` (default: 10 minutes). For batch processing jobs, use `noCursorTimeout` with explicit cursor management:

```javascript
const cursor = db.collection('records')
  .find({}, { noCursorTimeout: true }); // prevent idle kill

try {
  for await (const doc of cursor) {
    await processDocument(doc);
  }
} finally {
  await cursor.close(); // always close explicitly
}
```

### 5. Session Timeout in Transactions

Transactions are killed if they exceed `transactionLifetimeLimitSeconds` (default: 60s):

```javascript
// Increase for long transactions
db.adminCommand({ setParameter: 1, transactionLifetimeLimitSeconds: 120 })
```

Keep transactions short - move non-database work outside the transaction block.

## Identifying Kill Reason

Check the MongoDB log on the server:

```bash
sudo journalctl -u mongod --since "10 minutes ago" | grep -i "kill\|interrupt\|timeout"
```

In Atlas, check the query profiler and Atlas logs for operation termination events.

## Implementing Resilient Retry Logic

```javascript
async function executeWithRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const killCodes = [11600, 11601, 50]; // interrupted codes
      const isKilled = killCodes.includes(err.code);

      if (isKilled && attempt < maxRetries) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.warn(`Operation killed (code ${err.code}), retrying in ${backoff}ms`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      throw err;
    }
  }
}
```

## Summary

Operations killed by the server are due to `maxTimeMS` expiry, admin intervention, server restart, cursor timeout, or transaction lifetime expiry. Fix by adding indexes to speed up slow queries, enabling retryable writes for restart resilience, using `noCursorTimeout` for batch cursors, and keeping transactions under the lifetime limit.
