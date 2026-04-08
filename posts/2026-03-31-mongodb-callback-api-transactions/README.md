# How to Use the Callback API for Transaction Management in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Callback API, ACID, Node.js

Description: Learn how to use MongoDB's withTransaction callback API to manage transaction lifecycle automatically, including built-in retry logic for transient errors.

---

MongoDB's `withTransaction()` method is the recommended way to run transactions for most use cases. It wraps your transaction logic in a callback, automatically handles commit, abort, and retry for transient errors - significantly reducing the boilerplate you need to write compared to the Core API.

## How the Callback API Works

`session.withTransaction(callback)` executes the provided callback function within a transaction. If the callback throws an error with the `TransientTransactionError` label, it is automatically retried. If `commitTransaction()` fails with `UnknownTransactionCommitResult`, the commit is retried. You do not need to write retry loops yourself.

## Basic Usage

```javascript
const { MongoClient } = require('mongodb')

const client = new MongoClient('mongodb://localhost:27017')
await client.connect()
const db = client.db('shop')

const session = client.startSession()

try {
  await session.withTransaction(async (session) => {
    // Deduct from inventory
    const inventoryResult = await db.collection('inventory').updateOne(
      { sku: 'WIDGET-01', qty: { $gte: 2 } },
      { $inc: { qty: -2 } },
      { session }
    )

    if (inventoryResult.matchedCount === 0) {
      throw new Error('Insufficient inventory')
    }

    // Create the order
    await db.collection('orders').insertOne(
      {
        sku: 'WIDGET-01',
        qty: 2,
        userId: 'user-456',
        total: 49.99,
        status: 'confirmed',
        createdAt: new Date()
      },
      { session }
    )
  })

  console.log('Order placed successfully')

} finally {
  await session.endSession()
}
```

The callback automatically commits if it returns without throwing, and automatically aborts if it throws.

## Setting Transaction Options

Pass transaction options as the second argument to `withTransaction()`:

```javascript
await session.withTransaction(
  async (session) => {
    await db.collection('payments').insertOne(
      { amount: 99.99, status: 'processed', ts: new Date() },
      { session }
    )
    await db.collection('ledger').insertOne(
      { type: 'debit', amount: 99.99, ts: new Date() },
      { session }
    )
  },
  {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority', j: true },
    readPreference: 'primary'
  }
)
```

## Handling Application-Level Errors

Not all errors should trigger a retry. If an error represents a business rule violation (like insufficient funds), you want to abort without retrying. Throw the error to abort the transaction, but handle it outside `withTransaction()`:

```javascript
let insufficientFunds = false

try {
  await session.withTransaction(async (session) => {
    const account = await db.collection('accounts').findOne(
      { _id: 'acct-A' },
      { session }
    )

    if (account.balance < 200) {
      insufficientFunds = true
      throw new Error('InsufficientFunds') // aborts without retry (no TransientTransactionError label)
    }

    await db.collection('accounts').updateOne(
      { _id: 'acct-A' },
      { $inc: { balance: -200 } },
      { session }
    )
  })
} catch (err) {
  if (insufficientFunds) {
    console.log('Cannot transfer: insufficient funds')
  } else {
    throw err
  }
}
```

Note: since `withTransaction()` will retry on `TransientTransactionError`, ensure your callback is idempotent - running it multiple times should have the same net effect.

## Using withSession for Full Cleanup

Combine `withSession` and `withTransaction` to automatically clean up both session and transaction:

```javascript
await client.withSession(async (session) => {
  await session.withTransaction(async (session) => {
    await db.collection('users').updateOne(
      { _id: 'user-123' },
      { $set: { emailVerified: true, updatedAt: new Date() } },
      { session }
    )
    await db.collection('auditLog').insertOne(
      { userId: 'user-123', event: 'email_verified', ts: new Date() },
      { session }
    )
  })
})
```

## Callback API vs Core API

| Feature | Callback API (`withTransaction`) | Core API (manual) |
|---|---|---|
| Auto-retry transient errors | Yes | Manual |
| Auto-commit | Yes | Manual |
| Auto-abort on error | Yes | Manual |
| Code verbosity | Low | High |
| Custom retry logic | Limited | Full control |

Use the Callback API for most transaction scenarios. Switch to the Core API only when you need fine-grained control over retry behavior or transaction state.

## Summary

The `withTransaction()` callback API simplifies MongoDB transaction management by automatically handling commit, abort, and retry logic for transient errors. Wrap operations in the callback, pass transaction options as the second argument, and use `withSession` for complete lifecycle management. For most applications, the Callback API is the safest and most maintainable approach.
