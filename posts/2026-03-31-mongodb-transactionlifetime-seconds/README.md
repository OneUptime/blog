# How to Set transactionLifetimeLimitSeconds in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Configuration, Performance

Description: Learn how to configure transactionLifetimeLimitSeconds in MongoDB to control how long multi-document transactions can run before being automatically aborted.

---

Multi-document transactions in MongoDB are powerful, but long-running transactions can hold locks, consume memory, and block other operations. MongoDB automatically aborts transactions that exceed `transactionLifetimeLimitSeconds`. Understanding and tuning this setting is essential for stable production deployments.

## Default Value and Behavior

By default, `transactionLifetimeLimitSeconds` is set to **60 seconds**. Any transaction that exceeds this limit is automatically aborted by MongoDB's background cleanup process. This prevents runaway transactions from impacting cluster health.

## Setting transactionLifetimeLimitSeconds

You can configure this parameter at the `mongod` level using either the command line or the configuration file.

**Via mongod.conf:**

```yaml
setParameter:
  transactionLifetimeLimitSeconds: 120
```

**Via the mongosh shell (runtime, no restart needed):**

```javascript
db.adminCommand({
  setParameter: 1,
  transactionLifetimeLimitSeconds: 120
});
```

**Via command line flag:**

```bash
mongod --setParameter transactionLifetimeLimitSeconds=120
```

## Verifying the Current Value

To check the currently configured value:

```javascript
db.adminCommand({
  getParameter: 1,
  transactionLifetimeLimitSeconds: 1
});
```

Expected output:

```text
{ transactionLifetimeLimitSeconds: 120, ok: 1 }
```

## Choosing the Right Value

The right value depends on your workload. Consider the following guidelines:

- **OLTP workloads**: Keep the default (60s) or lower. Short transactions are safer.
- **Bulk operations or migrations**: Increase to 300-600s, but monitor for lock contention.
- **Minimum value is 1**: MongoDB requires this parameter to be at least 1 second. Setting it to 0 is not allowed and will be rejected with an error.

**Example: Setting a conservative 90-second limit for a mixed workload:**

```javascript
db.adminCommand({
  setParameter: 1,
  transactionLifetimeLimitSeconds: 90
});
```

## Monitoring Long-Running Transactions

Use `$currentOp` to find transactions approaching the limit:

```javascript
const operations = db.adminCommand({ currentOp: 1, active: true }).inprog;
operations
  .filter(op => op.transaction && op.secs_running > 5)
  .forEach(op => print("Long transaction:", op.opid, "- running", op.secs_running, "secs"));
```

Look for the `timeOpenMicros` field - transactions close to `transactionLifetimeLimitSeconds * 1000000` microseconds are at risk of being aborted.

## What Happens When a Transaction is Aborted

When MongoDB aborts a transaction due to this limit, the client receives an `ExceededTimeLimit` error (error code 50) with the `TransientTransactionError` label. Your application should catch this error and retry the transaction if appropriate:

```javascript
async function runWithRetry(session, fn) {
  while (true) {
    session.startTransaction();
    try {
      await fn(session);
      await session.commitTransaction();
      break;
    } catch (err) {
      await session.abortTransaction();
      if (err.hasErrorLabel("TransientTransactionError")) {
        continue; // retry
      }
      throw err;
    }
  }
}
```

## Replica Set vs Sharded Clusters

`transactionLifetimeLimitSeconds` is a `mongod` parameter. On sharded clusters, apply the same value to every shard and config server member so behavior stays consistent across the deployment. `mongos` does not use this parameter.

## Summary

`transactionLifetimeLimitSeconds` caps how long a MongoDB transaction can remain open, with a default of 60 seconds. You can adjust it at runtime using `setParameter` without restarting MongoDB. Always monitor long-running transactions with `$currentOp` and implement retry logic in your application to handle aborted transactions gracefully.
