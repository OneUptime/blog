# How to Monitor Active Connections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Connection, Administration, Performance

Description: Learn how to monitor active MongoDB connections using serverStatus, currentOp, and mongostat to detect connection exhaustion and identify long-running operations.

---

Monitoring active connections in MongoDB helps you detect connection pool exhaustion, identify idle connections from leaked clients, and spot long-running operations that hold connections open. MongoDB exposes connection metrics through several commands and tools.

## Checking Current Connection Count with serverStatus

```javascript
const status = db.adminCommand({ serverStatus: 1 });
const conn = status.connections;
print(`Current:   ${conn.current}`);
print(`Available: ${conn.available}`);
print(`Total:     ${conn.totalCreated}`);
```

- `current` - open connections right now
- `available` - remaining capacity before `maxIncomingConnections` is reached
- `totalCreated` - cumulative connections created since server start

Check the configured maximum:

```javascript
db.adminCommand({ getParameter: 1, maxIncomingConnections: 1 })
```

## Viewing Active Operations with currentOp

`currentOp` shows all operations currently being executed:

```javascript
db.adminCommand({ currentOp: true })
```

Filter to show only active operations (not idle connections):

```javascript
db.adminCommand({
  currentOp: true,
  active: true,
  secs_running: { $gt: 0 }
})
```

Find long-running operations (over 5 seconds):

```javascript
db.adminCommand({
  currentOp: true,
  active: true,
  secs_running: { $gte: 5 }
})
```

## Monitoring Connection Metrics Over Time

Query `serverStatus` repeatedly to track connection trends:

```javascript
// Poll every 10 seconds
function watchConnections(intervalSec, count) {
  for (let i = 0; i < count; i++) {
    const s = db.adminCommand({ serverStatus: 1 }).connections;
    print(`[${new Date().toISOString()}] current=${s.current} available=${s.available}`);
    sleep(intervalSec * 1000);
  }
}
watchConnections(10, 12);  // Monitor for 2 minutes
```

## Using mongostat for Real-Time Connection Monitoring

```bash
mongostat --host localhost:27017 \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  -o "connections.current,connections.available,opcounters.query,opcounters.insert" \
  1
```

`mongostat` polls every N seconds (1 second in this example) and outputs live metrics.

## Identifying Connections by Client

Use `currentOp` with `$all: true` to see per-connection client metadata:

```javascript
db.adminCommand({
  currentOp: true,
  $all: true
}).inprog.forEach(op => {
  if (op.client) {
    print(`${op.client} - ${op.op} - ${op.ns} - ${op.secs_running}s`);
  }
});
```

## Detecting Connection Leaks

A growing `current` value without a corresponding increase in application load indicates leaked connections (clients not calling `close()`):

```javascript
// Check connections per application client
db.adminCommand({ currentOp: true, $all: true })
  .inprog
  .filter(op => op.appName)
  .reduce((acc, op) => {
    acc[op.appName] = (acc[op.appName] || 0) + 1;
    return acc;
  }, {});
```

## Killing a Specific Connection

If you identify a leaked or stuck connection:

```javascript
// Get operation ID from currentOp
const ops = db.adminCommand({ currentOp: true, active: true });
const opid = ops.inprog[0].opid;

// Kill the operation
db.adminCommand({ killOp: 1, op: opid });
```

## Connection Metrics in Prometheus

If you use the MongoDB Prometheus exporter, key metrics to alert on:

```text
mongodb_connections{state="current"}    - current connections
mongodb_connections{state="available"}  - available slots
```

Alert when `current / (current + available) > 0.85` (85% capacity).

## Summary

Use `db.adminCommand({ serverStatus: 1 }).connections` for a quick connection snapshot and `currentOp` to see per-operation details. Monitor `current` connections relative to `maxIncomingConnections` to detect exhaustion. Use `mongostat` for real-time terminal monitoring and the Prometheus exporter for continuous alerting in production environments.
