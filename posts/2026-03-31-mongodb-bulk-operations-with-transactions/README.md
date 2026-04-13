# How to Use Bulk Operations with Transactions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bulk Operation, Transaction, ACID, Node.js

Description: Combine MongoDB bulk write operations with multi-document transactions to achieve atomicity across large batches of writes in a replica set.

---

## Overview

MongoDB transactions provide ACID guarantees across multiple documents and collections. Bulk operations reduce network round trips. Combining both lets you apply large batches of writes atomically - either all succeed or all fail - which is essential for financial data, inventory systems, and any workflow where partial updates would leave data in an inconsistent state.

## Prerequisites

Multi-document transactions require a replica set or sharded cluster. Start a single-node replica set for local development.

```bash
mongod --replSet rs0 --dbpath /data/db
mongosh --eval "rs.initiate()"
```

## Basic Pattern: Bulk Write Inside a Session

```javascript
const { MongoClient } = require('mongodb');

async function bulkTransfer(client, transfers) {
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const accounts = client.db('finance').collection('accounts');
      const ledger = client.db('finance').collection('ledger');

      // Bulk debit operations
      const debitBulk = accounts.initializeOrderedBulkOp({ session });
      for (const t of transfers) {
        debitBulk
          .find({ _id: t.fromId, balance: { $gte: t.amount } })
          .updateOne({ $inc: { balance: -t.amount } });
      }
      const debitResult = await debitBulk.execute();

      // Verify all debits succeeded
      if (debitResult.modifiedCount !== transfers.length) {
        throw new Error('Insufficient funds for one or more transfers');
      }

      // Bulk credit operations
      const creditBulk = accounts.initializeOrderedBulkOp({ session });
      for (const t of transfers) {
        creditBulk
          .find({ _id: t.toId })
          .updateOne({ $inc: { balance: t.amount } });
      }
      await creditBulk.execute();

      // Bulk insert ledger records
      const ledgerBulk = ledger.initializeUnorderedBulkOp({ session });
      for (const t of transfers) {
        ledgerBulk.insert({
          from: t.fromId,
          to: t.toId,
          amount: t.amount,
          ts: new Date()
        });
      }
      await ledgerBulk.execute();
    });

    console.log('All transfers committed successfully');
  } finally {
    await session.endSession();
  }
}
```

## Passing the Session to Bulk Operations

The session must be passed as an option to `initializeOrderedBulkOp()` or `initializeUnorderedBulkOp()`.

```javascript
// Correct - passes session so operations join the transaction
const bulk = collection.initializeUnorderedBulkOp({ session });

// Incorrect - operations run outside the transaction
const bulk = collection.initializeUnorderedBulkOp();
```

## Handling Transaction Errors and Retries

Transactions can fail with transient errors (write conflicts, network glitches). Use the built-in retry logic from `withTransaction`.

```javascript
const transactionOptions = {
  readPreference: 'primary',
  readConcern: { level: 'local' },
  writeConcern: { w: 'majority' },
  maxCommitTimeMS: 10000
};

await session.withTransaction(async () => {
  // Your bulk operations here
}, transactionOptions);
```

`withTransaction` automatically retries the callback on transient transaction errors and commit errors, so you do not need custom retry logic around the callback itself.

## Limitations to Know

- Transactions have a 60-second time limit by default. Large bulk batches that take longer will fail.
- Each transaction is limited to 16 MB of oplog entries. Split very large batches into smaller transaction chunks.
- Avoid long-running operations inside transactions to minimize lock contention.

```javascript
// Split large batches into transactional chunks
async function chunkedBulkTransaction(client, col, docs, chunkSize = 500) {
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const bulk = col.initializeUnorderedBulkOp({ session });
        chunk.forEach((doc) => bulk.insert(doc));
        await bulk.execute();
      });
    } finally {
      await session.endSession();
    }

    console.log(`Committed chunk ${Math.floor(i / chunkSize) + 1}`);
  }
}
```

## Summary

Bulk operations and transactions are complementary tools in MongoDB. Bulk operations reduce round trips; transactions provide atomicity. Pass the active session to each bulk builder using the `{ session }` option, use `withTransaction` for automatic retry handling, and split large datasets into smaller chunks to stay within transaction size and time limits.
