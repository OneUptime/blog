# How to Configure Write Concern with journal:true in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Concern, Journal, Durability, WiredTiger

Description: Learn how MongoDB's write concern j:true ensures writes are persisted to the on-disk journal before acknowledgment, protecting data from process crashes.

---

## What Is the j:true Write Concern?

The `j: true` (journal) parameter in a MongoDB write concern requires that a write be written to the on-disk write-ahead journal before the operation is acknowledged. This ensures that if the `mongod` process crashes immediately after returning success, the write can be recovered from the journal on restart.

Without `j: true`, writes may exist only in memory and are lost on a process crash (distinct from server hardware failure).

## The Journal's Role in MongoDB

WiredTiger, MongoDB's storage engine, maintains a write-ahead log (journal). Every write is first appended to the journal, then applied to the data files. On an unexpected shutdown, MongoDB replays the journal during startup to recover any writes that were journaled but not yet applied to the data files.

The journal is flushed to disk at a configurable interval (default: every 100ms). `j: true` forces an immediate flush before acknowledging.

## Setting j:true

At the operation level:

```javascript
db.accounts.insertOne(
  { userId: "u001", balance: 1000.00, currency: "USD" },
  { writeConcern: { w: 1, j: true } }
)
```

Combined with `w: "majority"`:

```javascript
db.payments.insertOne(
  { paymentId: "PAY-001", amount: 500 },
  { writeConcern: { w: "majority", j: true } }
)
```

In a connection string:

```text
mongodb://mongo1:27017/myapp?w=majority&journal=true&replicaSet=rs0
```

## What j:true Protects Against

```text
Scenario                      w:1 j:false   w:1 j:true   w:majority j:true
Process crash (OOM/kill)      Data lost     Recoverable  Recoverable on majority
Server hardware failure       Data lost     Data lost    Recoverable on majority
Network partition + primary   Rollback      Rollback     Durable
```

`j: true` protects against process crashes. It does not protect against hardware failure of the physical disk - that requires replication (`w: "majority"`).

## j:true and WiredTiger Internals

When `j: true` is specified:

1. The write enters the WiredTiger transaction log
2. MongoDB calls `fsync` (or equivalent) on the journal file
3. The journal write is confirmed on disk
4. The acknowledgment is sent to the client

This adds IO latency compared to `j: false`, which only waits for the write to be in the OS buffer cache.

## Performance Impact

Journal writes add disk IO overhead. The impact depends on storage hardware:

```text
Storage          j:false latency   j:true latency
NVMe SSD         ~0.1ms            ~0.5ms
SATA SSD         ~0.5ms            ~2ms
HDD (spinning)   ~2ms              ~5-10ms
```

On modern NVMe storage, the difference is negligible for most workloads.

## When to Use j:true

Use `j: true` when:

- Protecting financial records from process crashes (OOM killer, deployment restarts)
- Running MongoDB in a cloud environment where VMs can be restarted unexpectedly
- Using `w:1` and wanting crash protection without the latency of `w:majority`
- Writing idempotency keys or session tokens that must survive restarts

## Node.js Driver Example

```javascript
const { MongoClient, WriteConcern } = require("mongodb");

async function recordTransaction(txn) {
  const client = new MongoClient("mongodb://mongo1:27017/?replicaSet=rs0");
  await client.connect();

  const writeConcern = new WriteConcern(
    "majority",  // w
    10000,       // wtimeoutMS
    true         // j
  );

  const result = await client
    .db("finance")
    .collection("transactions")
    .insertOne(txn, { writeConcern });

  console.log("Transaction recorded:", result.insertedId);
  await client.close();
}
```

## j:true Is Ignored When journaling Is Disabled

If `mongod` is started with `--nojournal`, specifying `j: true` causes the write operation to fail with an error because the journal does not exist. In MongoDB 4.0+, journaling cannot be disabled for WiredTiger, so this is not a concern in modern deployments.

## j:false (Default) Behavior

When `j` is not specified or set to `false`, MongoDB waits for the write to reach the in-memory journal buffer but not necessarily the disk. The background journal flush (every 100ms by default) will eventually write it to disk, but a crash in that window loses the write.

## Summary

Write concern `j: true` requires MongoDB to flush the write to the on-disk journal before acknowledging success. This protects against data loss from process crashes (`mongod` being killed) while adding a small amount of write latency. Use it alongside `w: "majority"` for the strongest durability guarantee in a replica set - `j: true` protects each node's in-process writes, while `w: "majority"` ensures multiple nodes hold the data.
