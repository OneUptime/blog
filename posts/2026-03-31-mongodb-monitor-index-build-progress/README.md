# How to Monitor Index Build Progress in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Monitoring, Administration, currentOp

Description: Learn how to track the progress of index builds in MongoDB using currentOp, $indexBuildStats, and server status commands to estimate completion time.

---

Building an index on a large MongoDB collection can take a long time. Knowing how to monitor build progress lets you estimate completion, detect stalls, and decide whether to abort and reschedule.

## Using db.currentOp()

The primary tool for monitoring active index builds is `currentOp`:

```javascript
db.adminCommand({
  currentOp: true,
  $or: [
    { "command.createIndexes": { $exists: true } },
    { "command.index": { $exists: true } }
  ]
})
```

Or using the shell helper with a filter:

```javascript
db.currentOp({
  "command.createIndexes": { $exists: true }
})
```

Sample output for an active build:

```text
{
  "op": "command",
  "ns": "analytics.events",
  "command": {
    "createIndexes": "events",
    "indexes": [
      { "key": { "userId": 1, "createdAt": -1 }, "name": "idx_user_created" }
    ]
  },
  "msg": "Index Build: scanning collection",
  "progress": {
    "done": 7500000,
    "total": 25000000
  },
  "secs_running": 215,
  "opid": 45832
}
```

The `progress.done` and `progress.total` fields give you the document counts, allowing a rough percentage:

```javascript
// Calculate percentage in mongosh
const op = db.currentOp({ "command.createIndexes": { $exists: true } }).inprog[0]
const pct = (op.progress.done / op.progress.total * 100).toFixed(1)
print(`Index build: ${pct}% complete (${op.secs_running}s elapsed)`)
```

## Progress Message Phases

MongoDB reports different `msg` values as the build progresses:

```text
"Index Build: scanning collection"   - reading and inserting documents into index
"Index Build: draining writes received during build" - applying writes that occurred during the scan
```

The "scanning collection" phase is the longest and the only one that reports document-level progress.

## Using serverStatus for Index Build Metrics

The `serverStatus` command includes an `indexBuilds` section with aggregate metrics on index build activity:

```javascript
db.adminCommand({ serverStatus: 1 }).indexBuilds
```

Returns counters such as:

```text
{
  "total": 5,
  "killedDueToInsufficientDiskSpace": 0,
  "failedDueToDataCorruption": 0
}
```

## Estimating Time Remaining

Use elapsed time and progress to estimate completion:

```javascript
const op = db.currentOp({ "command.createIndexes": { $exists: true } }).inprog[0]
const done = op.progress.done
const total = op.progress.total
const elapsed = op.secs_running

if (done > 0) {
  const rate = done / elapsed  // docs per second
  const remaining = (total - done) / rate
  print(`Estimated time remaining: ${Math.round(remaining)}s`)
}
```

## Watching Progress Over Time

Poll currentOp in a loop to track the build rate:

```javascript
while (true) {
  const ops = db.currentOp({ "command.createIndexes": { $exists: true } }).inprog
  if (ops.length === 0) {
    print("No active index builds")
    break
  }
  ops.forEach(op => {
    const pct = (op.progress.done / op.progress.total * 100).toFixed(1)
    print(`${op.ns}: ${pct}% (${op.secs_running}s)`)
  })
  sleep(10000)  // check every 10 seconds
}
```

## Monitoring on Replica Sets

Since MongoDB 4.4, index builds are coordinated across replica set members via a commit quorum - the primary issues a `startIndexBuild` oplog entry and all data-bearing members build simultaneously. However, each member constructs the index data locally and progress may differ. Monitor progress on each member separately:

```bash
mongosh "mongodb://secondary1:27017" --eval \
  "db.adminCommand({ currentOp: true, 'command.createIndexes': { \$exists: true } })"
```

## Summary

Use `db.currentOp()` with a `createIndexes` filter to monitor index build progress in MongoDB. The `progress.done` and `progress.total` fields let you calculate completion percentage and estimate remaining time. On replica sets, monitor each member separately since progress varies. The `serverStatus` command's `indexBuilds` section provides aggregate counters for index build activity.
