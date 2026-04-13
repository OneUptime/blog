# How to Use the serverStatus Command in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Server, Monitoring, Performance, Administration, Diagnostic

Description: Learn how to use the serverStatus command in MongoDB to monitor server health, connections, memory usage, and operation counters.

---

## Introduction

The `serverStatus` command returns a comprehensive snapshot of the MongoDB server's current state. It covers connections, memory, operation counters, locking, replication, and storage engine metrics. This command is the foundation of most MongoDB monitoring solutions.

## Running serverStatus

```javascript
db.runCommand({ serverStatus: 1 });
```

To exclude specific sections for a lighter response:

```javascript
db.runCommand({
  serverStatus: 1,
  repl: 0,
  locks: 0,
  metrics: 0
});
```

## Key Sections and What They Mean

### Connections

```javascript
const status = db.runCommand({ serverStatus: 1 });
const conns = status.connections;
print(`Current: ${conns.current}`);
print(`Available: ${conns.available}`);
print(`Total created: ${conns.totalCreated}`);
```

A low `available` value (approaching 0) means you are near the connection limit.

### Memory Usage

```javascript
const mem = status.mem;
print(`Resident: ${mem.resident} MB`);
print(`Virtual: ${mem.virtual} MB`);
```

### Operation Counters

```javascript
const opcounters = status.opcounters;
print(`Inserts: ${opcounters.insert}`);
print(`Queries: ${opcounters.query}`);
print(`Updates: ${opcounters.update}`);
print(`Deletes: ${opcounters.delete}`);
print(`Getmores: ${opcounters.getmore}`);
print(`Commands: ${opcounters.command}`);
```

These are cumulative since the server started. Capture two snapshots and diff them for a rate.

### WiredTiger Cache

```javascript
const wt = status.wiredTiger.cache;
print(`Cache used: ${(wt["bytes currently in the cache"] / 1024 / 1024).toFixed(0)} MB`);
print(`Cache max: ${(wt["maximum bytes configured"] / 1024 / 1024).toFixed(0)} MB`);
print(`Pages evicted: ${wt["unmodified pages evicted"]}`);
```

If pages evicted is high, consider increasing the WiredTiger cache size.

## Building a Server Health Summary

```javascript
function serverHealth() {
  const s = db.runCommand({ serverStatus: 1 });
  print("=== MongoDB Server Health ===");
  print(`Uptime: ${(s.uptimeMillis / 1000 / 3600).toFixed(1)} hours`);
  print(`Connections: ${s.connections.current}/${s.connections.current + s.connections.available}`);
  print(`Resident memory: ${s.mem.resident} MB`);
  print(`Total inserts: ${s.opcounters.insert}`);
  print(`Active reads: ${s.globalLock.activeClients.readers}`);
  print(`Active writes: ${s.globalLock.activeClients.writers}`);
}

serverHealth();
```

## Summary

The `serverStatus` command is the primary diagnostic tool for MongoDB server health. By examining connections, memory, operation counters, and the WiredTiger cache, you can identify bottlenecks and monitor trends over time. Automating periodic `serverStatus` snapshots is the foundation of any effective MongoDB monitoring strategy.
