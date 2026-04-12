# How to Use mongotop to Track MongoDB Collection Activity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Operation, Performance, Tool

Description: Learn how to use mongotop to track read and write time spent per collection in real time, identify hot collections, and diagnose MongoDB performance issues.

---

## What is mongotop

`mongotop` is a command-line tool that shows how much time MongoDB spends reading and writing to each collection. It samples MongoDB's collection-level activity at a configurable interval, sorted by total time spent. It is analogous to the Linux `top` command but focused on MongoDB collections.

mongotop is part of the MongoDB Database Tools package, installed separately from the MongoDB server.

```mermaid
flowchart LR
    mongotop -->|top command poll| MongoDB
    MongoDB -->|time per collection: read, write, total| mongotop
    mongotop --> Output[Sorted table - refreshed every N seconds]
```

## Installation

On Ubuntu/Debian:

```bash
sudo apt-get install mongodb-database-tools
```

On RHEL/CentOS:

```bash
sudo yum install mongodb-database-tools
```

On macOS:

```bash
brew install mongodb/brew/mongodb-database-tools
```

## Basic Usage

Run mongotop with a 5-second polling interval:

```bash
mongotop --uri "mongodb://adminUser:password@127.0.0.1:27017/?authSource=admin" 5
```

Without specifying an interval, it defaults to 1 second:

```bash
mongotop --uri "mongodb://adminUser:password@127.0.0.1:27017/?authSource=admin"
```

## Understanding the Output

Each output block shows all collections with non-zero activity in the last interval, sorted by total time descending:

```text
2026-03-31T10:00:05Z

                       ns    total    read    write
   myapp.orders           1200ms     50ms   1150ms
   myapp.products          800ms    750ms     50ms
   myapp.users             200ms    200ms      0ms
   myapp.sessions          150ms    100ms     50ms
   local.oplog.rs           80ms      0ms     80ms
```

Column definitions:

| Column | Meaning |
|--------|---------|
| `ns` | Namespace (database.collection) |
| `total` | Total time spent on this collection during the interval |
| `read` | Time spent on read operations |
| `write` | Time spent on write operations |

The times are cumulative time spent across all operations on that collection during the polling interval. High values indicate heavy activity, not individual query latency.

## Additional Options

Use `--rowcount` to limit the number of times mongotop reports statistics. For example, run for exactly 30 samples at 5-second intervals then exit:

```bash
mongotop \
  --uri "mongodb://adminUser:password@127.0.0.1:27017/?authSource=admin" \
  --rowcount=30 \
  5
```

The `--locks` flag reported per-database lock information in MongoDB 3.x and earlier but is deprecated in MongoDB Database Tools 100.0.0 and is not needed for MongoDB 4.0+.

## Output as JSON

For scripting and log ingestion:

```bash
mongotop \
  --uri "mongodb://adminUser:password@127.0.0.1:27017/?authSource=admin" \
  --json \
  --rowcount=60 \
  5
```

Sample JSON output:

```text
{
  "totals": {
    "myapp.orders": { "total": { "time": 1200, "count": 450 }, "read": { "time": 50, "count": 80 }, "write": { "time": 1150, "count": 370 } },
    "myapp.products": { "total": { "time": 800, "count": 3200 }, "read": { "time": 750, "count": 3100 }, "write": { "time": 50, "count": 100 } }
  },
  "ts": "2026-03-31T10:00:05Z"
}
```

## Practical Use Cases

**Finding write-heavy collections during an incident:**

Sort by write time to identify which collection is causing write pressure:

```bash
mongotop \
  --uri "mongodb://adminUser:password@127.0.0.1:27017/?authSource=admin" \
  5
```

Observe the `write` column. If `orders` consistently shows high write time, investigate bulk inserts, updates, or missing indexes on that collection.

**Identifying read-heavy collections for caching:**

If a collection like `products` shows very high read time but low write time, it is a good candidate for an application-layer cache (Redis, Memcached) or a read replica.

**Baseline collection activity:**

Capture 5 minutes of data to baseline normal activity:

```bash
mongotop \
  --uri "mongodb://adminUser:password@127.0.0.1:27017/?authSource=admin" \
  --json \
  --rowcount=60 \
  5 > baseline-mongotop.json
```

## Comparing mongotop vs mongostat

| Tool | Shows | Best for |
|------|-------|---------|
| mongostat | Global operation rates, memory, connections | Server-level health overview |
| mongotop | Per-collection read/write time | Identifying hot collections |

Use both tools together: mongostat to confirm something is wrong at the server level, and mongotop to identify which collection is causing the issue.

## Connecting to a Replica Set

```bash
mongotop \
  --uri "mongodb://adminUser:password@primary:27017/?authSource=admin&replicaSet=rs0" \
  5
```

mongotop connects to the primary and reports activity from the primary's perspective.

## Permissions Required

The user running mongotop needs at least the `clusterMonitor` role:

```javascript
use admin

db.createUser({
  user: "monitorUser",
  pwd: passwordPrompt(),
  roles: [{ role: "clusterMonitor", db: "admin" }]
})
```

## Best Practices

- Run mongotop from a separate monitoring host, not from the MongoDB server itself.
- Use `--rowcount` to limit output in scripts - otherwise mongotop runs until interrupted.
- Use `--json` when integrating with log aggregation tools or custom monitoring scripts.
- Combine mongotop with `db.collection.stats()` to understand a hot collection's index usage and document count.
- After identifying a hot collection, run `db.setProfilingLevel(1)` on that database and analyze `system.profile` for slow queries on that collection.

## Summary

mongotop shows which MongoDB collections are consuming the most read and write time during each polling interval. It is the quickest way to identify hot collections during performance incidents. Collections with high write time suggest missing indexes or bulk write patterns; collections with high read time are candidates for caching or index optimization. Use mongotop alongside mongostat and the database profiler for a complete picture of MongoDB performance.
