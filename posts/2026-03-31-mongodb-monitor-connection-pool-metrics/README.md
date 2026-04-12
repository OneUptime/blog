# How to Monitor Connection Pool Metrics in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Pool, Monitoring, Metric, Observability

Description: Monitor MongoDB driver connection pool metrics using pool events, server status commands, and observability tools to detect exhaustion and optimize pool configuration.

---

## Why Monitor Connection Pool Metrics

Connection pool issues are a leading cause of application latency spikes and timeouts. Monitoring the pool helps you detect:
- Pool exhaustion (all connections checked out, requests queuing)
- Connection leaks (pool grows but connections are not returned)
- Excessive connection churn (connections created and closed rapidly)
- Under-provisioning (pool size too small for peak load)

## Driver-Level Pool Events

Modern MongoDB drivers emit Connection Monitoring and Pooling (CMAP) specification events. These are the most detailed pool metrics available.

### Node.js CMAP Events

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(uri, { maxPoolSize: 50 });

// Track current pool state
const poolState = {
  totalConnections: 0,
  checkedOut: 0,
  available: 0,
  waitQueueSize: 0
};

client.on("connectionCreated", () => {
  poolState.totalConnections++;
  poolState.available++;
});

client.on("connectionCheckOutStarted", () => {
  poolState.waitQueueSize++;
});

client.on("connectionCheckedOut", () => {
  poolState.checkedOut++;
  poolState.available--;
  poolState.waitQueueSize--;
});

client.on("connectionCheckOutFailed", () => {
  poolState.waitQueueSize--;
});

client.on("connectionCheckedIn", () => {
  poolState.checkedOut--;
  poolState.available++;
});

client.on("connectionClosed", () => {
  poolState.totalConnections--;
  poolState.available--;
});

// Expose metrics
setInterval(() => {
  console.log("Pool metrics:", JSON.stringify(poolState));
}, 5000);
```

### Python PyMongo Pool Events

```python
from pymongo import monitoring

class PoolEventListener(monitoring.ConnectionPoolListener):
    def __init__(self):
        self.checked_out = 0
        self.pool_size = 0

    def pool_created(self, event):
        print(f"Pool created for {event.address}")

    def connection_checked_out(self, event):
        self.checked_out += 1

    def connection_checked_in(self, event):
        self.checked_out -= 1

    def connection_created(self, event):
        self.pool_size += 1

    def connection_closed(self, event):
        self.pool_size -= 1
        print(f"Connection closed: {event.reason}")

listener = PoolEventListener()
monitoring.register(listener)
```

## Server-Side Connection Metrics

Query the server for active connection counts:

```javascript
const status = db.adminCommand({ serverStatus: 1 });

console.log("Current connections:", status.connections.current);
console.log("Available connections:", status.connections.available);
console.log("Total created:", status.connections.totalCreated);
```

For Atlas, the same metrics are available in the **Metrics** tab under **Connections**.

## Emitting Metrics to Prometheus

```javascript
const promClient = require("prom-client");

const connCheckedOut = new promClient.Gauge({
  name: "mongodb_pool_checked_out",
  help: "MongoDB connections currently checked out",
  labelNames: ["host"]
});

const connAvailable = new promClient.Gauge({
  name: "mongodb_pool_available",
  help: "MongoDB connections available in pool",
  labelNames: ["host"]
});

client.on("connectionCheckedOut", (event) => {
  connCheckedOut.inc({ host: event.address });
  connAvailable.dec({ host: event.address });
});

client.on("connectionCheckedIn", (event) => {
  connCheckedOut.dec({ host: event.address });
  connAvailable.inc({ host: event.address });
});
```

## Key Metrics to Alert On

```text
Metric                              | Alert Threshold
------------------------------------|----------------------------------
checkedOut / maxPoolSize            | > 0.8 (80% utilization)
waitQueueSize                       | > 0 for sustained periods
connectionClosed with reason="error"| Any non-zero value
connectionCreated rate              | Spikes indicate connection churn
serverStatus.connections.current    | Approaching maxIncomingConnections
```

## Summary

MongoDB connection pool monitoring requires instrumentation at both the driver level (CMAP events for checked-out count, wait queue size, and connection lifecycle) and the server level (`serverStatus.connections` for total active connections). Expose these as metrics to Prometheus or your monitoring platform and alert when pool utilization exceeds 80% or when connections queue up in the wait queue, which indicates the pool is too small for current traffic.
