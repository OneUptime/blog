# How to Tail the Oplog for Custom CDC Solutions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Change Data Capture, CDC, Replication

Description: Build a custom Change Data Capture solution by tailing the MongoDB oplog directly, with examples for filtering events and handling cursor resumption.

---

Change Data Capture (CDC) allows downstream systems to react to database changes in real time. While MongoDB Change Streams are the recommended modern API, tailing the oplog directly gives you access to raw operation details and is useful for low-level integrations or environments where Change Streams have limitations.

## Why Tail the Oplog Directly?

- Access to raw oplog operation types (`i`, `u`, `d`, `c`)
- See raw update diffs and full replacement documents in the oplog entry
- Lower overhead for simple event streaming use cases
- Compatibility with older MongoDB deployments

## Prerequisites

Oplog tailing requires replica set mode. Standalone deployments do not have an oplog. You also need `clusterMonitor` or `read` role on the `local` database.

## Basic Oplog Tail (Node.js)

```javascript
const { MongoClient, Timestamp } = require("mongodb");

async function tailOplog() {
  const client = new MongoClient("mongodb://localhost:27017/?replicaSet=rs0");
  await client.connect();

  const oplog = client.db("local").collection("oplog.rs");

  // Start from now
  const startTs = new Timestamp({ t: Math.floor(Date.now() / 1000), i: 0 });

  const cursor = oplog.find(
    { ts: { $gt: startTs }, ns: /^mydb\./ },
    {
      tailable: true,
      awaitData: true,
      noCursorTimeout: true
    }
  );

  console.log("Tailing oplog...");
  for await (const entry of cursor) {
    handleEntry(entry);
  }
}

function handleEntry(entry) {
  const { op, ns, o, o2, ts } = entry;
  switch (op) {
    case "i": console.log("INSERT into", ns, JSON.stringify(o)); break;
    case "u": console.log("UPDATE in",  ns, JSON.stringify(o2), "->", JSON.stringify(o)); break;
    case "d": console.log("DELETE from",ns, JSON.stringify(o)); break;
    case "c": console.log("COMMAND in", ns, JSON.stringify(o)); break;
  }
}

tailOplog().catch(console.error);
```

## Resuming After Restart

Save the last processed timestamp to a persistent store and resume from it on restart:

```javascript
const fs = require("fs");
const CHECKPOINT_FILE = "./oplog-checkpoint.json";

function saveCheckpoint(ts) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ t: ts.t, i: ts.i }));
}

function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_FILE)) return null;
  const { t, i } = JSON.parse(fs.readFileSync(CHECKPOINT_FILE));
  return new Timestamp({ t, i });
}

// Use in tail loop:
const startTs = loadCheckpoint() || new Timestamp({ t: Math.floor(Date.now() / 1000), i: 0 });
```

After processing each entry, call `saveCheckpoint(entry.ts)`.

## Filtering by Operation Type

```javascript
const cursor = oplog.find({
  ts: { $gt: startTs },
  ns: "mydb.orders",
  op: { $in: ["i", "u"] }  // inserts and updates only
}, { tailable: true, awaitData: true });
```

## Oplog vs Change Streams

| Feature               | Oplog Tailing         | Change Streams           |
|-----------------------|-----------------------|--------------------------|
| API complexity        | Higher                | Lower                    |
| Resume token          | Manual (timestamp)    | Automatic (resume token) |
| Pre-image support     | No                    | Yes (with config)        |
| Sharded cluster       | Per-shard             | Unified                  |
| Atlas support         | No (local db blocked) | Yes                      |

## Summary

Tailing the MongoDB oplog enables custom CDC pipelines by reading raw operations from the `local.oplog.rs` collection using a tailable cursor. Save the last processed `ts` timestamp to disk for reliable resumption after restarts. For new applications, prefer MongoDB Change Streams, which offer a higher-level API with built-in resume tokens and sharded cluster support. Use direct oplog tailing only when you need raw operation access or are working with legacy deployments.
