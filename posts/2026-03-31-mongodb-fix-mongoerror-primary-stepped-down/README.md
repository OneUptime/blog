# How to Fix MongoError: Primary Stepped Down During Write in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Primary, Failover, Error

Description: Learn why the MongoDB primary steps down during writes and how to fix it using retryable writes, proper error handling, and replica set health monitoring.

---

## Understanding the Error

`MongoServerError: not primary` or `MongoServerError: primary stepped down` occurs when the replica set primary steps down mid-operation - typically due to a manual step-down, network partition, or election triggered by health checks:

```text
MongoServerError: not primary
    code: 10107, codeName: 'NotWritablePrimary'
```

```text
MongoServerError: Replication primary stepped down, primary is no longer primary
    code: 189, codeName: 'PrimarySteppedDown'
```

## How Primary Elections Work

In a replica set, the primary accepts all writes. If the primary becomes unavailable or steps down:

1. The primary steps down (voluntarily or due to health check failure)
2. Secondaries detect the primary is gone via heartbeats
3. An election occurs - a secondary becomes the new primary
4. This typically takes 10-30 seconds

During this window, write operations fail with `NotWritablePrimary`.

## Fix 1: Enable Retryable Writes

The driver can automatically retry writes on the new primary after an election:

```javascript
const client = new MongoClient(uri, {
  retryWrites: true, // enabled by default in MongoDB 4.2+ drivers
  retryReads: true
});
```

With retryable writes enabled, most write operations succeed automatically after the election completes, without any changes to application code.

## Fix 2: Handle the Error in Application Code

For operations that cannot be automatically retried (multi-statement operations, transactions), catch the error and retry:

```javascript
const PRIMARY_ERRORS = [10107, 189, 91]; // NotWritablePrimary, PrimarySteppedDown, ShutdownInProgress

async function writeWithFailoverRetry(collection, doc, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await collection.insertOne(doc);
    } catch (err) {
      const isPrimary = PRIMARY_ERRORS.includes(err.code) ||
                        err.message.includes('not primary') ||
                        err.hasErrorLabel('RetryableWriteError');

      if (isPrimary && i < maxRetries - 1) {
        console.warn(`Primary stepped down, waiting for election (attempt ${i + 1})...`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}
```

## Fix 3: Use Transactions With Retry

For multi-document operations, use explicit transactions with the retry pattern:

```javascript
async function runTransactionWithRetry(session, transactionFn) {
  while (true) {
    try {
      await session.withTransaction(transactionFn);
      return;
    } catch (err) {
      if (err.hasErrorLabel('TransientTransactionError')) {
        console.log('Transient error, retrying transaction...');
        continue;
      } else if (err.hasErrorLabel('UnknownTransactionCommitResult')) {
        // Transaction may or may not have committed - handle idempotently
        console.log('Unknown commit result - check idempotency key');
        throw err;
      }
      throw err;
    }
  }
}
```

## Fix 4: Investigate Why the Primary Is Stepping Down

Frequent elections indicate an unhealthy replica set:

```javascript
// Check replica set status
rs.status()

// Check election log
db.adminCommand({ replSetGetStatus: 1 }).members.forEach(m => {
  print(`${m.name}: state=${m.stateStr}, lastDurable=${m.optimeDurableDate}`);
});
```

Common causes of unplanned step-downs:
- Network latency between primary and secondaries exceeding election timeout
- Primary under CPU/memory pressure causing heartbeat delays
- Storage I/O saturation causing the primary to miss heartbeats

```bash
# Check system resources on the primary
top -b -n1 | head -20
iostat -x 1 3
```

## Fix 5: Tune Election Timeout

If network latency is causing false failovers, increase the election timeout:

```javascript
// In replica set configuration
cfg = rs.conf()
cfg.settings.electionTimeoutMillis = 15000 // 15 seconds (default: 10s)
rs.reconfig(cfg)
```

## Summary

Primary step-down errors are an expected part of replica set operation during planned maintenance or unplanned failures. Enable retryable writes to handle most cases automatically, implement retry logic for transactions and multi-statement operations, and investigate frequent elections by checking replica set health, network latency, and resource utilization on the primary.
