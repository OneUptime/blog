# How to Use Read Concern 'linearizable' in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Concern, Consistency, Replication, Linearizability, Query

Description: Learn how to use read concern linearizable in MongoDB for the strongest consistency guarantee, ensuring reads reflect all prior majority-committed writes.

---

## Introduction

Read concern `linearizable` is the strongest consistency level in MongoDB. It guarantees that a read reflects all successful writes that completed before the read began, even in a distributed system with multiple replicas. This goes beyond `majority` by ensuring you do not read stale data that was majority-committed before a more recent write.

## How "linearizable" Works

When you issue a read with concern `linearizable`, MongoDB:
1. Waits for the primary to be confirmed as the current primary (no network partition)
2. Waits for all prior majority-committed writes to be reflected
3. Then returns the data

This ensures strict ordering - the result you see is the most up-to-date majority-committed state.

## Key Limitations

- Only works on the primary node
- Only applies to single-document reads (not multi-document queries or aggregations on multiple documents)
- Has higher latency than `local` or `majority`
- Should be combined with `maxTimeMS` to avoid blocking indefinitely

## Setting Read Concern in mongosh

```javascript
db.accounts.findOne(
  { userId: "usr-123" },
  null,
  { readConcern: { level: "linearizable" }, maxTimeMS: 5000 }
);
```

## Setting Read Concern in Node.js

```javascript
const { MongoClient } = require("mongodb");
const client = new MongoClient("mongodb://localhost:27017");
await client.connect();

const accounts = client.db("mydb").collection("accounts");

const account = await accounts.findOne(
  { userId: "usr-123" },
  {
    readConcern: { level: "linearizable" },
    maxTimeMS: 5000
  }
);
```

## Practical Use Cases

Use `linearizable` for:
- Critical single-document reads where stale data could cause incorrect business decisions
- Read-after-write patterns where you need to guarantee seeing your own writes
- Financial account balance checks before processing a transaction

```javascript
// Check balance before debit - must see absolute latest committed balance
const account = await accounts.findOne(
  { accountId: "ACC-001" },
  { readConcern: { level: "linearizable" }, maxTimeMS: 3000 }
);

if (account.balance >= debitAmount) {
  // Proceed with debit
}
```

## Comparison with "majority"

| Concern | Staleness Risk | Latency | Multi-doc |
|---------|---------------|---------|-----------|
| local | Yes (rollback possible) | Lowest | Yes |
| majority | No rollback | Low | Yes |
| linearizable | No staleness | Higher | No |

## Summary

Read concern `linearizable` provides the strictest consistency guarantee in MongoDB, ensuring reads return the most recently majority-committed data. It is appropriate for critical single-document operations where even a brief staleness window is unacceptable. Always set `maxTimeMS` when using `linearizable` to prevent indefinite blocking if the primary becomes unavailable.
