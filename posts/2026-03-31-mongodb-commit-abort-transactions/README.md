# How to Commit and Abort Transactions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Commit, Abort, ACID

Description: Learn how to properly commit and abort MongoDB multi-document transactions, handle transient errors, and ensure data consistency in Node.js applications.

---

After starting a MongoDB transaction and running operations, you must explicitly commit or abort it. `commitTransaction()` makes all changes durable and visible, while `abortTransaction()` rolls back every write. Understanding when and how to call each is essential for correct ACID behavior.

## Committing a Transaction

Call `commitTransaction()` after all operations have succeeded. MongoDB will atomically apply every write in the transaction and make them visible to other clients:

```javascript
const { MongoClient } = require('mongodb')

const client = new MongoClient('mongodb://localhost:27017')
await client.connect()

const session = client.startSession()
const db = client.db('banking')

try {
  session.startTransaction({
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' }
  })

  await db.collection('accounts').updateOne(
    { _id: 'alice', balance: { $gte: 500 } },
    { $inc: { balance: -500 } },
    { session }
  )

  await db.collection('accounts').updateOne(
    { _id: 'bob' },
    { $inc: { balance: 500 } },
    { session }
  )

  await session.commitTransaction()
  console.log('Funds transferred successfully')

} catch (err) {
  if (session.inTransaction()) {
    await session.abortTransaction()
  }
  throw err

} finally {
  await session.endSession()
}
```

## Aborting a Transaction

Call `abortTransaction()` in error handlers to roll back all writes made during the transaction. No partial changes will persist:

```javascript
try {
  session.startTransaction()
  // operation 1 succeeds
  await db.collection('inventory').updateOne(
    { sku: 'ABC', stock: { $gte: 10 } },
    { $inc: { stock: -10 } },
    { session }
  )
  // operation 2 fails (item not found or validation error)
  const result = await db.collection('orders').insertOne(
    { sku: 'ABC', qty: 10, userId: null }, // validation will reject null userId
    { session }
  )

  await session.commitTransaction()
} catch (err) {
  // All writes are rolled back
  if (session.inTransaction()) {
    await session.abortTransaction()
  }
  console.error('Transaction aborted, no changes persisted:', err.message)
}
```

## Handling Transient Transaction Errors

MongoDB can return `TransientTransactionError` for temporary conditions like write conflicts or network issues. These errors are safe to retry:

```javascript
async function runWithRetry(fn, session, maxAttempts = 3) {
  let attempts = 0
  while (attempts < maxAttempts) {
    try {
      session.startTransaction()
      await fn(session)
      await session.commitTransaction()
      return
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction()
      }

      const isTransient = err.errorLabels &&
        err.errorLabels.includes('TransientTransactionError')

      if (isTransient && attempts < maxAttempts - 1) {
        attempts++
        console.log(`Retrying transaction (attempt ${attempts})`)
        continue
      }

      throw err
    }
  }
}

await runWithRetry(async (session) => {
  await db.collection('seats').updateOne(
    { _id: 'seat-12A', status: 'available' },
    { $set: { status: 'reserved', userId: 'user789' } },
    { session }
  )
  await db.collection('reservations').insertOne(
    { seatId: 'seat-12A', userId: 'user789', ts: new Date() },
    { session }
  )
}, session)
```

## Handling UnknownTransactionCommitResult

If `commitTransaction()` throws with the `UnknownTransactionCommitResult` error label, the commit may or may not have succeeded. Retry the commit - do not abort and restart:

```javascript
async function commitWithRetry(session) {
  while (true) {
    try {
      await session.commitTransaction()
      break
    } catch (err) {
      const isUnknown = err.errorLabels &&
        err.errorLabels.includes('UnknownTransactionCommitResult')

      if (isUnknown) {
        console.log('Commit result unknown, retrying commit...')
        continue
      }
      throw err
    }
  }
}
```

## Implicit Abort on Session End

If you end a session while a transaction is still open (neither committed nor aborted), MongoDB automatically aborts the transaction. Relying on this is not recommended - always explicitly abort in error handlers to make intent clear.

## Summary

`commitTransaction()` atomically applies all transaction writes and makes them visible, while `abortTransaction()` rolls back every write with no side effects. Always check `session.inTransaction()` before aborting to avoid double-abort errors. Retry logic for `TransientTransactionError` and `UnknownTransactionCommitResult` is essential for production robustness.
