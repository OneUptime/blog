# How to Use Snapshot Reads for Consistent Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Snapshot, Transaction, Read Concern, Consistency

Description: Learn how to use snapshot reads in MongoDB to get a consistent point-in-time view of your data, preventing phantom reads and non-repeatable reads in multi-step operations.

---

## What Are Snapshot Reads

A snapshot read provides a consistent view of the database at a specific point in time. All reads within a snapshot see the same version of documents, regardless of writes happening concurrently. This prevents phantom reads - where a document appears or disappears between two reads in the same operation - and non-repeatable reads, where the same document returns different values on two reads.

MongoDB implements snapshot reads through the `snapshot` read concern, available within sessions and multi-document transactions.

## Why You Need Snapshot Reads

Without snapshot isolation, a multi-step read operation can observe inconsistent data:

```text
Time 1: Read account A balance -> $1,000
Time 2: Another process transfers $500 from A to B
Time 3: Read account B balance -> $1,500

Result: Total appears to be $2,500, but it should be $2,000
```

With snapshot isolation, both reads observe the database state at the same point in time.

## Using Snapshot Reads in a Transaction

The `snapshot` read concern is most commonly used within multi-document transactions:

```javascript
const { MongoClient } = require("mongodb");

async function getConsistentBalances(clientId) {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const session = client.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const accounts = client.db("bank").collection("accounts");
      const transactions = client.db("bank").collection("transactions");

      // Both reads see the same database snapshot
      const account = await accounts.findOne(
        { clientId },
        { session }
      );

      const recentTx = await transactions.find(
        { clientId, date: { $gte: new Date("2025-01-01") } },
        { session }
      ).toArray();

      result = { balance: account.balance, transactions: recentTx };
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" }
    });

    return result;
  } finally {
    await session.endSession();
    await client.close();
  }
}
```

## Using Snapshot Reads Outside Transactions (MongoDB 5.0+)

Starting in MongoDB 5.0, you can use `snapshot` read concern for certain read-only operations outside of transactions by using a session.

```javascript
const session = client.startSession();

const orders = await collection.find(
  { status: "pending" },
  { session, readConcern: { level: "snapshot" } }
).toArray();

await session.endSession();
```

## Python Example with Snapshot Read

```python
import pymongo

client = pymongo.MongoClient("mongodb://localhost:27017")

with client.start_session() as session:
    with session.start_transaction(
        read_concern=pymongo.read_concern.ReadConcern("snapshot"),
        write_concern=pymongo.write_concern.WriteConcern("majority")
    ):
        accounts = client["bank"]["accounts"]
        txns = client["bank"]["transactions"]

        account = accounts.find_one({"clientId": "c-123"}, session=session)
        history = list(txns.find({"clientId": "c-123"}, session=session))

        session.commit_transaction()
```

## Limitations of Snapshot Reads

```text
- Only available within sessions (and usually transactions)
- Snapshot read concern requires a replica set or sharded cluster
- Long-running snapshot transactions can cause WiredTiger cache pressure
- Documents modified after the snapshot point are not visible
```

## Summary

Snapshot reads in MongoDB provide consistent point-in-time views of data by using the `snapshot` read concern within sessions and transactions. They prevent phantom reads and non-repeatable reads in multi-step operations like financial calculations, report generation, or data exports. Use snapshot reads when consistency across multiple collection queries matters, and keep transactions short to avoid WiredTiger cache contention from holding old document versions open.
