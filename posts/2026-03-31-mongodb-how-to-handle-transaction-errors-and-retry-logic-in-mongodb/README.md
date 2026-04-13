# How to Handle Transaction Errors and Retry Logic in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Error Handling, Retry, Concurrency

Description: Implement robust retry logic for MongoDB multi-document transactions to handle transient errors like write conflicts and network issues gracefully.

---

## Why Transactions Need Retry Logic

MongoDB multi-document transactions can fail with transient errors that are safe to retry. The most common are `WriteConflict` (two transactions modified the same document) and `TransientTransactionError` (network hiccup or primary failover). Without retry logic, these errors bubble up as failures even though retrying would succeed.

## Identifying Retryable Errors

MongoDB marks retryable errors with error labels. Always check for these labels before deciding whether to retry.

```javascript
function isTransientError(error) {
  return (
    error.hasErrorLabel?.("TransientTransactionError") ||
    error.hasErrorLabel?.("UnknownTransactionCommitResult")
  );
}
```

## Basic Retry Wrapper

```javascript
async function withTransaction(client, txnFunc, maxRetries = 3) {
  let attempts = 0;

  while (attempts < maxRetries) {
    const session = client.startSession();
    try {
      session.startTransaction({
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" }
      });

      await txnFunc(session);
      await session.commitTransaction();
      return;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        // Transaction may already be aborted by the server
      }

      if (error.hasErrorLabel?.("TransientTransactionError") && attempts < maxRetries - 1) {
        attempts++;
        const delay = Math.min(100 * Math.pow(2, attempts), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
```

## Using the Built-in withTransaction Helper

The MongoDB Node.js driver provides a `withTransaction` helper that handles transient retries automatically:

```javascript
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    const accounts = db.collection("accounts");

    await accounts.updateOne(
      { _id: fromAccountId },
      { $inc: { balance: -amount } },
      { session }
    );

    await accounts.updateOne(
      { _id: toAccountId },
      { $inc: { balance: amount } },
      { session }
    );
  });
} finally {
  await session.endSession();
}
```

The driver automatically retries the entire callback on `TransientTransactionError`.

## Handling UnknownTransactionCommitResult

Commit can fail with `UnknownTransactionCommitResult`, meaning the commit may or may not have succeeded. Retry the commit only - do not re-run the transaction body.

```javascript
async function commitWithRetry(session) {
  while (true) {
    try {
      await session.commitTransaction();
      return;
    } catch (error) {
      if (error.hasErrorLabel("UnknownTransactionCommitResult")) {
        continue; // Retry commit
      }
      throw error;
    }
  }
}
```

## Logging and Observability

Log retries with context so you can monitor transaction conflict rates:

```javascript
console.warn("Transaction retry", {
  attempt: attempts,
  errorCode: error.code,
  errorMessage: error.message,
  operation: "fund_transfer"
});
```

## Summary

MongoDB transactions require explicit retry logic because write conflicts and transient network errors are expected. Use the built-in `withTransaction` driver helper for automatic retry of transient errors, implement exponential backoff for manual retry loops, and handle `UnknownTransactionCommitResult` by retrying only the commit step. Always instrument retries to track conflict rates in production.
