# How to Implement Distributed Transactions Across Shards in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Distributed Transaction, Sharding, ACID, Cluster

Description: Learn how MongoDB coordinates distributed transactions across multiple shards using two-phase commit, and how to configure sharded clusters for reliable cross-shard writes.

---

MongoDB 4.2 extended multi-document transactions to sharded clusters, enabling ACID-compliant writes across multiple shards in a single transaction. Under the hood, MongoDB uses a two-phase commit (2PC) protocol coordinated by a designated coordinator shard. This guide explains how distributed transactions work and how to use them effectively.

## Requirements for Sharded Transactions

- MongoDB 4.2 or later
- `featureCompatibilityVersion` set to 4.2 or higher
- A properly configured sharded cluster with `mongos`, config servers, and shards
- Replica sets on each shard (standalone shards cannot participate in transactions)

## How Distributed Transactions Work

When a transaction touches documents on multiple shards, MongoDB coordinates a two-phase commit using a designated **coordinator shard**:

1. **Prepare phase**: The coordinator shard sends a `prepareTransaction` command to each participant shard. Each shard locks the affected documents and writes a prepare record to its oplog.
2. **Commit phase**: Once all shards confirm they are prepared, the coordinator sends `commitTransaction` to all participants. If any shard fails to prepare, the coordinator sends `abortTransaction` to all.

The `mongos` initiates the process by forwarding the client's commit request to the coordinator shard (via `coordinateCommitTransaction`), but it is the coordinator shard that drives the two-phase commit protocol.

This ensures all-or-nothing semantics across shards.

## Writing a Cross-Shard Transaction

From the application perspective, distributed transactions look identical to single-shard transactions. The `mongos` handles coordination transparently:

```javascript
const { MongoClient } = require('mongodb')

const client = new MongoClient('mongodb://mongos-host:27017')
await client.connect()
const db = client.db('marketplace')

const session = client.startSession()

try {
  await session.withTransaction(async (session) => {
    // This write may go to shard A (sharded by sellerId)
    await db.collection('inventory').updateOne(
      { productId: 'PRD-100', sellerId: 'seller-001', qty: { $gte: 1 } },
      { $inc: { qty: -1 } },
      { session }
    )

    // This write may go to shard B (sharded by buyerId)
    await db.collection('orders').insertOne(
      {
        productId: 'PRD-100',
        buyerId: 'buyer-999',
        sellerId: 'seller-001',
        amount: 79.99,
        status: 'confirmed',
        createdAt: new Date()
      },
      { session }
    )

    // This write may go to shard C (sharded by accountId)
    await db.collection('payments').insertOne(
      {
        accountId: 'buyer-999',
        amount: -79.99,
        type: 'purchase',
        ts: new Date()
      },
      { session }
    )
  }, {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' }
  })

  console.log('Cross-shard transaction committed')

} finally {
  await session.endSession()
}
```

## Enabling Cross-Shard Transactions for a Collection

Ensure each collection is sharded and indexed correctly before running transactions:

```javascript
// Connect to mongos
sh.enableSharding('marketplace')

db.adminCommand({
  shardCollection: 'marketplace.inventory',
  key: { sellerId: 'hashed' }
})

db.adminCommand({
  shardCollection: 'marketplace.orders',
  key: { buyerId: 'hashed' }
})
```

## Performance Considerations

Distributed transactions carry overhead compared to single-shard transactions:

- The 2PC protocol adds at least one extra network round trip per shard
- Document locks are held across all participating shards until commit
- Transaction timeout defaults to 60 seconds (`transactionLifetimeLimitSeconds`)

Minimize cross-shard transaction latency with these practices:

```javascript
// Keep transactions short - do not perform slow reads outside the transaction
// before starting it. Prefetch data if possible:
const productInfo = await db.collection('products').findOne({ _id: 'PRD-100' })
// validate productInfo here before opening the transaction

// Then open transaction only for the writes
await session.withTransaction(async (session) => {
  // fast writes only
})
```

## Adjusting Transaction Timeout

Increase the timeout for long-running distributed transactions on the `mongos` and shards:

```javascript
// On each mongos and shard, in mongod.conf or via setParameter
db.adminCommand({
  setParameter: 1,
  transactionLifetimeLimitSeconds: 120
})
```

## Monitoring Distributed Transactions

Use `currentOp` to see in-flight transactions across shards:

```javascript
db.adminCommand({
  currentOp: true,
  active: true,
  'transaction': { $exists: true }
})
```

Key fields to watch: `transaction.parameters.txnNumber`, `transaction.timeOpenMicros`, and `waitingForLock`.

## Summary

MongoDB distributed transactions across shards use a two-phase commit protocol managed by `mongos`, providing ACID guarantees without application-level changes. Transactions on sharded clusters look identical to replica set transactions from application code. Minimize cross-shard transactions by choosing shard keys that colocate related data, keep transaction durations short, and monitor with `currentOp` to detect lock contention.
