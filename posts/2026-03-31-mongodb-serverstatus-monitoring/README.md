# How to Monitor MongoDB with db.serverStatus()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Observability, Operation, Performance

Description: Learn how to use db.serverStatus() to monitor MongoDB health, connections, memory, WiredTiger cache, replication lag, and operation metrics in real time.

---

## What is db.serverStatus()

`db.serverStatus()` is MongoDB's primary diagnostic command. It returns a large document containing dozens of metrics about the current state of the MongoDB instance: connections, memory usage, opcounters, cache statistics, locking, replication lag, and more.

```mermaid
flowchart LR
    S[db.serverStatus()] --> C[connections]
    S --> M[mem]
    S --> O[opcounters]
    S --> W[wiredTiger]
    S --> R[repl]
    S --> L[locks]
    S --> A[asserts]
    S --> N[network]
    C --> C1[current, available, totalCreated]
    M --> M1[resident, virtual]
    O --> O1[insert, query, update, delete, command]
    W --> W1[cache hit ratio, evictions]
```

## Running the Command

Run from mongosh (requires `serverStatus` privilege on the `admin` database):

```javascript
db.adminCommand({ serverStatus: 1 })
```

Or using the helper:

```javascript
db.serverStatus()
```

The output is large. Use JavaScript dot notation to extract specific sections:

```javascript
db.serverStatus().connections
db.serverStatus().opcounters
db.serverStatus().wiredTiger.cache
```

## Key Sections to Monitor

### connections

Shows how many clients are connected and whether you are approaching the connection limit.

```javascript
db.serverStatus().connections
```

Output:

```text
{
  current: 42,
  available: 999958,
  totalCreated: 1234,
  active: 8,
  exhaustIsMaster: 0,
  exhaustHello: 12,
  awaitingTopologyChanges: 0
}
```

Alert if `current / (current + available)` exceeds 80%.

### opcounters

Shows the cumulative count of each operation type since startup. Compute rates by sampling at intervals.

```javascript
db.serverStatus().opcounters
```

Output:

```text
{
  insert: NumberLong(450000),
  query: NumberLong(8900000),
  update: NumberLong(220000),
  delete: NumberLong(15000),
  getmore: NumberLong(3400),
  command: NumberLong(12000000)
}
```

### mem

Reports memory usage in megabytes.

```javascript
db.serverStatus().mem
```

Output:

```text
{
  bits: 64,
  resident: 2048,      // MB of physical RAM used
  virtual: 8192,       // MB of virtual memory
  supported: true
}
```

Watch `resident` to ensure MongoDB is not consuming more RAM than allocated.

### WiredTiger Cache

The WiredTiger cache is critical to performance. A high cache miss ratio indicates that the working set does not fit in memory.

```javascript
db.serverStatus().wiredTiger.cache
```

Key fields:

```text
{
  "bytes currently in the cache": 1073741824,        // current cache usage
  "maximum bytes configured": 2147483648,            // cacheSizeGB * 1024^3
  "bytes read into cache": 5000000000,
  "bytes written from cache": 4000000000,
  "pages read into cache": 12000,
  "pages requested from the cache": 9000000,
  "pages evicted by application threads": 100,       // should be low
  "unmodified pages evicted": 5000,
  "modified pages evicted": 200,                     // high = memory pressure
  "tracked dirty bytes in the cache": 10000000,
  "pages with counts queued for eviction": 0
}
```

Compute the cache hit ratio:

```javascript
const cache = db.serverStatus().wiredTiger.cache;
const hits = cache["pages requested from the cache"];
const reads = cache["pages read into cache"];
const hitRatio = ((hits - reads) / hits * 100).toFixed(2);
print(`Cache hit ratio: ${hitRatio}%`);
```

Target a cache hit ratio above 95%.

### repl (Replica Set Metrics)

```javascript
db.serverStatus().repl
```

Key fields:

```text
{
  setName: "rs0",
  isWritablePrimary: true,
  secondary: false,
  hosts: ["mongo1:27017", "mongo2:27017", "mongo3:27017"],
  primary: "mongo1:27017",
  me: "mongo1:27017"
}
```

Check replication lag separately:

```javascript
rs.printSecondaryReplicationInfo()
```

### locks

Identifies lock contention:

```javascript
db.serverStatus().locks
```

High `timeAcquiringMicros` values indicate lock contention that is slowing down operations.

### asserts

Asserts indicate internal errors. Any non-zero value in `msg` or `rollovers` warrants investigation.

```javascript
db.serverStatus().asserts
```

## Building a Monitoring Script

The following script samples key metrics at a 5-second interval:

```javascript
function sampleMetrics() {
  const s = db.serverStatus();
  return {
    ts: new Date(),
    connections: s.connections.current,
    insert: s.opcounters.insert,
    query: s.opcounters.query,
    update: s.opcounters.update,
    delete: s.opcounters.delete,
    residentMB: s.mem.resident,
    cacheUsedBytes: s.wiredTiger.cache["bytes currently in the cache"],
    cacheMaxBytes: s.wiredTiger.cache["maximum bytes configured"]
  };
}

let prev = sampleMetrics();
sleep(5000);
let curr = sampleMetrics();

const elapsed = (curr.ts - prev.ts) / 1000;

print("Ops/sec over last " + elapsed + "s:");
print("  inserts:", ((curr.insert - prev.insert) / elapsed).toFixed(0));
print("  queries:", ((curr.query - prev.query) / elapsed).toFixed(0));
print("  updates:", ((curr.update - prev.update) / elapsed).toFixed(0));
print("  deletes:", ((curr.delete - prev.delete) / elapsed).toFixed(0));
print("Connections:", curr.connections);
print("Resident MB:", curr.residentMB);
```

## Excluding Sections for Performance

If `serverStatus()` is slow (unlikely but possible on very busy servers), exclude sections you don't need:

```javascript
db.adminCommand({
  serverStatus: 1,
  repl: 0,
  locks: 0,
  wiredTiger: 0
})
```

## Automating with Prometheus

The MongoDB Exporter (`mongodb_exporter`) continuously scrapes `serverStatus()` and exposes metrics in Prometheus format. Key exported metrics include:

```text
mongodb_connections_current
mongodb_opcounters_insert_total
mongodb_wiredtiger_cache_bytes_currently_in_cache
mongodb_ss_mem_resident
```

## Best Practices

- Sample `serverStatus()` on a schedule (every 30-60 seconds) and store time-series data.
- Alert on: connections above 80% of max, cache hit ratio below 95%, replication lag above 60 seconds.
- Monitor `opcounters` rate of change to detect traffic spikes early.
- Use `rs.printSecondaryReplicationInfo()` in addition to `serverStatus()` for replica set health.
- Avoid running `serverStatus()` more than once per 10 seconds in production as it has a small but non-zero overhead.

## Summary

`db.serverStatus()` is the starting point for all MongoDB monitoring. The most important sections are `connections`, `opcounters`, `mem`, and `wiredTiger.cache`. Compute the cache hit ratio to understand whether your working set fits in memory, monitor connection counts to detect client connection leaks, and watch opcounters rates to understand load patterns. Automate collection with the MongoDB Exporter for continuous monitoring with Prometheus and Grafana.
