# How to Optimize Transaction Performance in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Performance, Optimization, ACID

Description: Learn practical techniques to optimize MongoDB transaction performance, including reducing lock contention, minimizing transaction duration, and choosing the right read/write concerns.

---

MongoDB transactions provide ACID guarantees, but they carry overhead compared to single-document operations. Poorly designed transactions can cause lock contention, high latency, and reduced throughput. This guide covers actionable techniques to make your transactions fast and efficient.

## Keep Transactions Short

The most important rule: minimize the time between `startTransaction()` and `commitTransaction()`. Long transactions hold locks longer, increasing the chance of conflicts and timeouts.

Bad pattern - doing heavy computation or I/O inside a transaction:

```javascript
// BAD: slow external call inside transaction
await session.withTransaction(async (session) => {
  const user = await db.collection('users').findOne({ _id: userId }, { session })
  const score = await callExternalCreditScoringAPI(user)  // slow!
  await db.collection('applications').insertOne({ userId, score }, { session })
})
```

Good pattern - fetch data before opening the transaction:

```javascript
// GOOD: fetch and prepare outside transaction
const user = await db.collection('users').findOne({ _id: userId })
const score = await callExternalCreditScoringAPI(user)

// Transaction only covers the atomic writes
await session.withTransaction(async (session) => {
  await db.collection('applications').insertOne(
    { userId, score, ts: new Date() },
    { session }
  )
})
```

## Read Before Write - Minimize Reads Inside Transactions

Reads inside transactions extend the transaction's duration, increasing the chance of write conflicts and timeouts. Move non-critical reads outside:

```javascript
// Pre-read catalog data
const product = await db.collection('products').findOne({ _id: productId })
if (!product || product.stock < qty) throw new Error('Unavailable')

// Transaction only writes
await session.withTransaction(async (session) => {
  await db.collection('products').updateOne(
    { _id: productId, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { session }
  )
  await db.collection('orders').insertOne(
    { productId, qty, userId, ts: new Date() },
    { session }
  )
})
```

## Use Indexes for All Transactional Reads

Unindexed reads within transactions cause collection scans, which hold locks on more documents. Always index the fields used in transaction queries:

```javascript
// Ensure these indexes exist before running transactions
db.inventory.createIndex({ sku: 1 })
db.orders.createIndex({ userId: 1, status: 1 })
db.accounts.createIndex({ accountId: 1 })
```

Verify with `explain()` that all transaction queries use `IXSCAN` not `COLLSCAN`:

```bash
db.inventory.find({ sku: "ABC" }).explain("executionStats")
```

## Tune Read and Write Concerns

Choose the least strict concerns that meet your durability requirements:

```javascript
// For analytics or non-critical data: lower concerns for speed
await session.withTransaction(async (session) => {
  await db.collection('events').insertOne(
    { type: 'page_view', url: '/home', ts: new Date() },
    { session }
  )
}, {
  readConcern: { level: 'local' },      // faster than 'snapshot'
  writeConcern: { w: 1, j: false }      // faster than w: 'majority'
})

// For financial data: use strongest concerns
await session.withTransaction(async (session) => {
  // ... payment writes
}, {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority', j: true }
})
```

## Avoid Hotspot Documents

If many transactions update the same document (like a counter or global balance), they will serialize and block each other. Distribute writes using bucketing or sharding:

```javascript
// BAD: all transactions update the same counter document
await db.collection('counters').updateOne(
  { name: 'globalOrderCount' },
  { $inc: { count: 1 } },
  { session }
)

// GOOD: use multiple counter buckets, aggregate for the total
const bucket = Math.floor(Math.random() * 10)
await db.collection('counters').updateOne(
  { name: 'globalOrderCount', bucket },
  { $inc: { count: 1 } },
  { session, upsert: true }
)
```

## Batch Writes Within a Single Transaction

Combine multiple inserts into `insertMany()` to reduce round trips:

```javascript
await session.withTransaction(async (session) => {
  // One insertMany instead of multiple insertOne calls
  await db.collection('auditLog').insertMany(
    events.map(e => ({ ...e, ts: new Date() })),
    { session, ordered: false }
  )
})
```

## Monitor with currentOp

Identify slow or stuck transactions in production:

```javascript
db.adminCommand({
  currentOp: true,
  'transaction.timeActiveMicros': { $gt: 1000000 } // > 1 second
})
```

## Summary

Optimize MongoDB transaction performance by keeping transactions short, moving reads outside transaction boundaries, ensuring all transactional queries use indexes, choosing appropriate read/write concerns, and avoiding hotspot documents. Batch writes with `insertMany()` to cut round trips. Monitor long-running transactions with `currentOp` to detect bottlenecks before they impact users.
