# How to Set Transaction Timeout Limits in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Timeout, Configuration, Performance

Description: Learn how to configure MongoDB transaction timeout limits using transactionLifetimeLimitSeconds and maxTimeMS to prevent long-running transactions from blocking your cluster.

---

MongoDB automatically aborts transactions that exceed a configurable time limit. Without proper timeout settings, long-running transactions can hold locks, block other operations, and degrade cluster performance. This guide explains the available timeout controls and how to tune them for your workload.

## The Default Timeout

By default, MongoDB aborts any transaction that has been open for more than **60 seconds**. This limit is controlled by the `transactionLifetimeLimitSeconds` parameter on `mongod` (and `mongos` for sharded clusters).

## Setting transactionLifetimeLimitSeconds

Change the transaction lifetime limit using `setParameter`:

```javascript
// Set globally via the admin command (takes effect immediately, not persistent)
db.adminCommand({
  setParameter: 1,
  transactionLifetimeLimitSeconds: 120  // increase to 2 minutes
})

// Verify the current setting
db.adminCommand({ getParameter: 1, transactionLifetimeLimitSeconds: 1 })
```

To make the change persistent, add it to `mongod.conf`:

```text
setParameter:
  transactionLifetimeLimitSeconds: 120
```

For sharded clusters, set this parameter on every `mongod` shard member and `mongos` instance. The lowest value among all participants takes effect.

## Setting maxCommitTimeMS on Individual Transactions

For finer control over the commit phase, set `maxCommitTimeMS` as a transaction option. This limits how long the commit operation itself can take and causes MongoDB to abort the commit with a `MaxTimeMSExpired` error if it does not complete within the limit:

```javascript
const session = client.startSession()

try {
  await session.withTransaction(
    async (session) => {
      await db.collection('inventory').updateOne(
        { sku: 'ABC', qty: { $gte: 1 } },
        { $inc: { qty: -1 } },
        { session }
      )
      await db.collection('orders').insertOne(
        { sku: 'ABC', userId: 'u-001', ts: new Date() },
        { session }
      )
    },
    {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      maxCommitTimeMS: 5000  // commit must complete within 5 seconds
    }
  )
} finally {
  await session.endSession()
}
```

Note: `maxCommitTimeMS` applies only to the commit phase, not the entire transaction duration. The overall transaction is still bounded by `transactionLifetimeLimitSeconds`.

## Handling Timeout Errors

When a transaction times out, MongoDB returns error code `50` with the message `MaxTimeMSExpired` or aborts with `TransactionExceededLifetimeLimitSeconds`. Handle these gracefully:

```javascript
try {
  await session.withTransaction(async (session) => {
    // ... operations
  })
} catch (err) {
  if (err.code === 50 || err.codeName === 'MaxTimeMSExpired') {
    console.error('Transaction timed out - consider breaking it into smaller transactions')
  } else if (err.errorLabels?.includes('TransientTransactionError')) {
    console.error('Transient error - safe to retry')
  } else {
    throw err
  }
}
```

## Idle vs Active Transaction Timeout

MongoDB tracks two timers:

- **Total lifetime** (`transactionLifetimeLimitSeconds`): wall clock time since `startTransaction()`
- **Lock acquisition timeout**: if a transaction waits too long to acquire locks, it may be killed by the lock manager

To set a separate lock wait timeout:

```javascript
db.adminCommand({
  setParameter: 1,
  maxTransactionLockRequestTimeoutMillis: 5  // 5ms wait for lock, then abort (default: 5)
})
```

A value of `-1` means use `maxTimeMS` from the transaction. A value of `0` means fail immediately if lock is not available.

## Recommendations by Workload

```text
OLTP workloads (e-commerce, banking):
  transactionLifetimeLimitSeconds: 30-60
  maxTransactionLockRequestTimeoutMillis: 5-50

Batch or migration transactions:
  transactionLifetimeLimitSeconds: 300-600
  Run during off-peak hours

Analytics (use with caution):
  Prefer aggregation pipelines over transactions
  If needed: transactionLifetimeLimitSeconds: 120
```

## Monitoring Expired Transactions

Use the server status metrics to track transaction timeouts:

```javascript
const stats = db.serverStatus()
console.log(stats.transactions)
// {
//   totalStarted: 15234,
//   totalAborted: 120,
//   totalCommitted: 15114,
//   totalContactedParticipants: 15234,
//   ...
// }
```

## Summary

MongoDB transaction timeouts are controlled by `transactionLifetimeLimitSeconds` (global, default 60s) and `maxCommitTimeMS` (per-transaction commit phase). Set these in `mongod.conf` for persistence and update them dynamically with `setParameter`. Handle `MaxTimeMSExpired` errors explicitly and tune lock wait timeout with `maxTransactionLockRequestTimeoutMillis` to prevent lock contention cascades.
