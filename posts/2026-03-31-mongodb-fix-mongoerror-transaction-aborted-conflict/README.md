# How to Fix MongoError: Transaction Aborted Due to Conflict in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Write Conflict, Concurrency, Error

Description: Learn why MongoDB transactions abort due to write conflicts and how to fix them with retry logic, transaction design, and conflict-reducing patterns.

---

## Understanding the Error

`MongoServerError: Transaction aborted. Write conflict during plan execution and retries are disabled` (error code 112, `WriteConflict`) occurs when two concurrent transactions attempt to modify the same document and one must be aborted to resolve the conflict.

```text
MongoServerError: WriteConflict: Write conflict during plan execution and retries are disabled.
    code: 112, codeName: 'WriteConflict'
    errorLabels: ['TransientTransactionError']
```

MongoDB uses MVCC (multiversion concurrency control) with a first-writer-wins policy. When two transactions each try to modify the same document, the first one to perform the write holds the lock - the second is aborted with a write conflict.

## Fix 1: Implement the TransientTransactionError Retry Loop

The `TransientTransactionError` error label means the transaction can be safely retried. The driver documentation recommends a retry loop:

```javascript
async function runTransactionWithRetry(session, fn) {
  while (true) {
    try {
      await session.withTransaction(fn);
      return; // success
    } catch (err) {
      if (err.hasErrorLabel('TransientTransactionError')) {
        console.log('Write conflict, retrying transaction...');
        continue; // retry immediately
      }
      throw err; // non-transient error, do not retry
    }
  }
}

const session = client.startSession();
try {
  await runTransactionWithRetry(session, async () => {
    const db = client.db('mydb');
    await db.collection('inventory').updateOne(
      { sku: 'WIDGET', qty: { $gte: 1 } },
      { $inc: { qty: -1 } },
      { session }
    );
    await db.collection('orders').insertOne(
      { sku: 'WIDGET', status: 'placed', ts: new Date() },
      { session }
    );
  });
} finally {
  await session.endSession();
}
```

## Fix 2: Reduce Conflict Surface Area

Transactions that modify the same documents frequently will conflict more often. Strategies to reduce conflicts:

### Use Atomic Single-Document Operations When Possible

Many multi-step operations can be expressed as a single atomic `findOneAndUpdate`:

```javascript
// Atomic decrement - no transaction needed
const result = await db.collection('inventory').findOneAndUpdate(
  { sku: 'WIDGET', qty: { $gte: 1 } },
  { $inc: { qty: -1 } },
  { returnDocument: 'after' }
);

if (!result) throw new Error('Out of stock');
```

### Shorten Transaction Duration

Long-running transactions hold document locks longer, increasing the chance of conflicts. Move any non-database work outside the transaction:

```javascript
// BAD - compute-heavy work inside transaction
await session.withTransaction(async () => {
  const product = await db.collection('products').findOne({ sku }, { session });
  const price = await fetchPriceFromExternalApi(product); // external call - DO NOT do this in a transaction
  await db.collection('orders').insertOne({ sku, price }, { session });
});

// GOOD - fetch data first, then transaction
const product = await db.collection('products').findOne({ sku });
const price = await fetchPriceFromExternalApi(product);

await session.withTransaction(async () => {
  await db.collection('orders').insertOne({ sku, price }, { session });
});
```

## Fix 3: Exponential Backoff on Retry

For high-contention scenarios, add backoff between retries:

```javascript
async function runWithBackoff(session, fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await session.withTransaction(fn);
      return;
    } catch (err) {
      if (err.hasErrorLabel('TransientTransactionError') && i < maxRetries - 1) {
        const delay = Math.min(100 * Math.pow(2, i), 2000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}
```

## Fix 4: Queue Conflicting Writes

For extremely high-conflict scenarios (e.g., a popular counter), use an application-level queue or a dedicated counters collection with Redis-based locking.

## Summary

Transaction write conflicts are normal in concurrent systems and are designed to be retried. Always wrap transactions in a `TransientTransactionError` retry loop, minimize transaction duration by moving non-database work outside the transaction, prefer single-document atomic operations when only one document is involved, and use exponential backoff for high-contention collections.
