# How to Use MongoDB Transactions for ACID Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, ACID, Database, Data Integrity

Description: Learn how MongoDB implements ACID transactions, when to use them, and how to execute single and multi-document transactions with proper error handling across collections.

---

## ACID in MongoDB

ACID stands for Atomicity, Consistency, Isolation, and Durability. MongoDB has supported multi-document ACID transactions since version 4.0 for replica sets and since 4.2 for sharded clusters.

```mermaid
flowchart TD
    T[startSession] --> S[startTransaction]
    S --> O1[Operation 1: debit account]
    O1 --> O2[Operation 2: credit account]
    O2 --> O3[Operation 3: insert ledger entry]
    O3 --> D{Decision}
    D -->|all ok| C[commitTransaction]
    D -->|any error| R[abortTransaction]
    C --> Done[Changes visible atomically]
    R --> Rolled[All changes rolled back]
```

**Atomicity** - either all operations in the transaction commit or none do.
**Consistency** - the database moves from one valid state to another.
**Isolation** - concurrent transactions do not see each other's uncommitted changes (snapshot isolation by default).
**Durability** - committed transactions survive crashes when the journal is enabled.

## When to Use Transactions

MongoDB transactions are appropriate when:
- You need to modify multiple documents atomically (e.g., transferring money between accounts).
- Operations span multiple collections and must all succeed or all fail.
- Your application requires strict consistency guarantees.

For single-document operations, MongoDB already provides atomic guarantees without transactions. Use transactions only for multi-document scenarios - they add latency and resource overhead.

## Single-Document Atomicity (No Transaction Needed)

A single `updateOne` is always atomic in MongoDB:

```javascript
db.accounts.updateOne(
  { _id: "acc123", balance: { $gte: 100 } },
  { $inc: { balance: -100 }, $push: { transactions: { type: "debit", amount: 100, date: new Date() } } }
)
```

## Multi-Document Transactions in mongosh

```javascript
const session = db.getMongo().startSession();

session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" }
});

try {
  const accounts = session.getDatabase("myapp").accounts;
  const ledger = session.getDatabase("myapp").ledger;

  // Debit sender
  accounts.updateOne(
    { _id: "acc-001", balance: { $gte: 500 } },
    { $inc: { balance: -500 } },
    { session }
  );

  // Credit receiver
  accounts.updateOne(
    { _id: "acc-002" },
    { $inc: { balance: 500 } },
    { session }
  );

  // Insert ledger entry
  ledger.insertOne({
    from: "acc-001",
    to: "acc-002",
    amount: 500,
    date: new Date()
  }, { session });

  session.commitTransaction();
  print("Transaction committed.");
} catch (error) {
  session.abortTransaction();
  print("Transaction aborted:", error.message);
} finally {
  session.endSession();
}
```

## Transactions in Node.js

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://admin:password@127.0.0.1:27017/?authSource=admin&replicaSet=rs0");

async function transferFunds(fromAccount, toAccount, amount) {
  await client.connect();
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const db = client.db("myapp");
      const accounts = db.collection("accounts");
      const ledger = db.collection("ledger");

      const sender = await accounts.findOne({ _id: fromAccount }, { session });
      if (!sender || sender.balance < amount) {
        throw new Error("Insufficient funds");
      }

      await accounts.updateOne(
        { _id: fromAccount },
        { $inc: { balance: -amount } },
        { session }
      );

      await accounts.updateOne(
        { _id: toAccount },
        { $inc: { balance: amount } },
        { session }
      );

      await ledger.insertOne({
        from: fromAccount,
        to: toAccount,
        amount,
        timestamp: new Date(),
        status: "completed"
      }, { session });
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" }
    });

    console.log("Transfer successful");
  } finally {
    await session.endSession();
    await client.close();
  }
}

transferFunds("acc-001", "acc-002", 500).catch(console.error);
```

The `withTransaction()` helper automatically retries the transaction on transient errors (like `WriteConflict`) and handles `commitTransaction()` and `abortTransaction()` calls.

## Transactions in Python

```python
from pymongo import MongoClient
from pymongo.errors import OperationFailure

client = MongoClient("mongodb://admin:password@127.0.0.1:27017/?authSource=admin&replicaSet=rs0")

def transfer_funds(from_account, to_account, amount):
    with client.start_session() as session:
        with session.start_transaction():
            db = client["myapp"]
            accounts = db["accounts"]
            ledger = db["ledger"]

            sender = accounts.find_one({"_id": from_account}, session=session)
            if not sender or sender["balance"] < amount:
                raise ValueError("Insufficient funds")

            accounts.update_one(
                {"_id": from_account},
                {"$inc": {"balance": -amount}},
                session=session
            )

            accounts.update_one(
                {"_id": to_account},
                {"$inc": {"balance": amount}},
                session=session
            )

            ledger.insert_one({
                "from": from_account,
                "to": to_account,
                "amount": amount,
                "timestamp": __import__("datetime").datetime.utcnow(),
                "status": "completed"
            }, session=session)

        print("Transfer committed successfully")

transfer_funds("acc-001", "acc-002", 500)
```

## Read and Write Concerns in Transactions

For critical transactions, use majority-level concerns:

```javascript
session.startTransaction({
  readConcern: { level: "snapshot" },    // repeatable read - sees committed data at transaction start
  writeConcern: { w: "majority" }        // waits for majority of replica set members to acknowledge
});
```

Read concern levels for transactions:
- `snapshot` - sees a consistent snapshot of data from the start of the transaction (recommended)
- `local` - reads most recent data, but may see data that is later rolled back on secondaries
- `majority` - reads data acknowledged by a majority of replica set members

## Transaction Limits

Be aware of these constraints:

- Maximum transaction duration: 60 seconds by default (configurable with `transactionLifetimeLimitSeconds`)
- Each individual document is still subject to the 16MB BSON document size limit
- Before MongoDB 4.4, transactions could not create new collections. Starting with MongoDB 4.4, transactions can create collections and indexes
- Transactions work only on replica sets and sharded clusters - not on standalone instances
- Avoid long-running transactions; they hold locks and increase conflict risk

## Best Practices

- Use `session.withTransaction()` (Node.js) or `session.with_transaction()` (Python) for automatic retry logic on transient errors. The `with session.start_transaction()` context manager in Python handles commit and abort but does not retry automatically.
- Keep transactions as short as possible - minimize the number of operations and avoid user interaction mid-transaction.
- Pre-create all collections before starting a transaction (required before MongoDB 4.4).
- Use `readConcern: snapshot` and `writeConcern: majority` for financial or inventory operations.
- Handle `TransientTransactionError` and `UnknownTransactionCommitResult` errors explicitly in low-level code.
- Monitor transaction metrics via `db.serverStatus().transactions`.

## Summary

MongoDB provides full ACID multi-document transactions for replica sets (4.0+) and sharded clusters (4.2+). Use `session.startTransaction()` to begin, and commit or abort based on whether all operations succeeded. The `withTransaction()` helper in Node.js and `with_transaction()` in Python handle retries and cleanup. Keep transactions short, use `snapshot` read concern for consistency, and pre-create collections before starting a transaction if using MongoDB versions prior to 4.4.
