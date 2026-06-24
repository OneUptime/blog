# How to Use the Core API for Manual Transaction Control in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Core API, Manual Control, Node.js

Description: Learn how to use MongoDB's Core API for full manual transaction control, including custom retry logic, savepoints, and fine-grained error handling in Node.js.

---

While MongoDB's Callback API (`withTransaction`) handles most use cases automatically, the Core API gives you full manual control over transaction lifecycle. This is useful when you need custom retry strategies, conditional commit paths, multi-step error handling, or integration with external systems within a transaction.

## Core API Fundamentals

With the Core API, you manually call `startTransaction()`, `commitTransaction()`, and `abortTransaction()`. You are responsible for all retry logic:

```javascript
const { MongoClient } = require('mongodb')

const client = new MongoClient('mongodb://localhost:27017')
await client.connect()
const db = client.db('ecommerce')
const session = client.startSession()

try {
  session.startTransaction({
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' }
  })

  // Step 1: reserve item
  const reserved = await db.collection('inventory').findOneAndUpdate(
    { sku: 'ITEM-99', qty: { $gte: 1 } },
    { $inc: { qty: -1 } },
    { session, returnDocument: 'after' }
  )

  if (!reserved) {
    await session.abortTransaction()
    console.log('Item out of stock')
    return
  }

  // Step 2: create order
  await db.collection('orders').insertOne(
    {
      sku: 'ITEM-99',
      userId: 'u-001',
      reservedAt: new Date(),
      status: 'reserved'
    },
    { session }
  )

  await session.commitTransaction()
  console.log('Transaction committed')

} catch (err) {
  if (session.inTransaction()) {
    await session.abortTransaction()
  }
  throw err

} finally {
  await session.endSession()
}
```

## Implementing Custom Retry Logic

The Core API lets you implement exactly the retry strategy you need. Here is a pattern that retries on transient errors with exponential backoff:

```javascript
async function runTransactionWithRetry(db, session, txnFn) {
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    try {
      session.startTransaction()
      await txnFn(session)
      await commitWithRetry(session)
      return
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction()
      }

      const isTransient = err.errorLabels &&
        err.errorLabels.includes('TransientTransactionError')

      if (isTransient && attempts < maxAttempts - 1) {
        attempts++
        const delay = Math.pow(2, attempts) * 50  // 100ms, 200ms, 400ms...
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw err
    }
  }

  throw new Error('Transaction failed after max retries')
}

async function commitWithRetry(session) {
  while (true) {
    try {
      await session.commitTransaction()
      return
    } catch (err) {
      if (err.errorLabels?.includes('UnknownTransactionCommitResult')) {
        console.log('Commit result unknown - retrying...')
        continue
      }
      throw err
    }
  }
}
```

## Conditional Commit Paths

The Core API lets you decide at runtime whether to commit or abort based on results:

```javascript
session.startTransaction()

const fraud = await db.collection('fraudSignals').findOne(
  { userId: 'u-001', flagged: true },
  { session }
)

if (fraud) {
  await db.collection('orders').insertOne(
    { status: 'blocked', reason: 'fraud', userId: 'u-001' },
    { session }
  )
  // Commit the blocked order record, but do not charge or fulfill
  await session.commitTransaction()
  console.log('Order blocked due to fraud signal')
  return
}

await db.collection('orders').insertOne(
  { status: 'confirmed', userId: 'u-001', amount: 29.99 },
  { session }
)
await session.commitTransaction()
```

## Interleaving Non-Transactional Operations

Sometimes you need to read data outside the transaction (for logging, notifications, or external API calls) before deciding to commit:

```javascript
session.startTransaction()

// Read inside transaction
const account = await db.collection('accounts').findOne(
  { _id: 'acct-1' },
  { session }
)

// Call external payment API (outside transaction)
const paymentResult = await chargeExternalPaymentGateway(account)

if (!paymentResult.success) {
  await session.abortTransaction()
  console.log('Payment failed, transaction aborted')
  return
}

// Write result inside transaction
await db.collection('accounts').updateOne(
  { _id: 'acct-1' },
  { $inc: { balance: -paymentResult.amount } },
  { session }
)

await session.commitTransaction()
```

## Checking Transaction Status

```javascript
// Before aborting, check if transaction is still active
if (session.inTransaction()) {
  await session.abortTransaction()
}

// Log session ID for debugging
console.log('Session LSID:', JSON.stringify(session.id))
```

## Summary

The Core API for MongoDB transactions offers full manual control over `startTransaction()`, `commitTransaction()`, and `abortTransaction()`. It is best suited for custom retry strategies with exponential backoff, conditional commit paths, or workflows that interleave transactional and non-transactional operations. For simpler use cases, the Callback API (`withTransaction`) is preferred.
