# How to Tune maxIncomingConnections for High-Concurrency MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection, Configuration, Performance, Scalability

Description: Configure maxIncomingConnections and connection pool settings to optimize MongoDB for high-concurrency workloads and prevent connection exhaustion.

---

## Connection Architecture

MongoDB uses a thread-per-connection model on the server. Each incoming connection gets a dedicated thread with a 1MB stack. Too many connections consume memory and cause context-switching overhead; too few cause connection queue timeouts.

Key parameters:
- **`maxIncomingConnections`**: Max connections the mongod accepts (server-side limit)
- **`maxPoolSize`**: Max connections per driver client (client-side pool)
- **`minPoolSize`**: Minimum connections kept alive in the pool

## Check Current Connection Usage

```javascript
// Check connections
db.serverStatus().connections
```

Output:
```json
{
  "current": 245,
  "available": 755,
  "totalCreated": 12450,
  "rejected": 0,
  "active": 48
}
```

- `current`: Total open connections (including idle)
- `available`: Remaining connection slots
- `active`: Connections currently processing a request

Alert if `available` approaches 0.

## Step 1: Check Current maxIncomingConnections

```javascript
// Check via serverStatus
db.adminCommand({ serverStatus: 1 }).connections.current
db.adminCommand({ serverStatus: 1 }).connections.available

// Check current parameter
db.adminCommand({ getParameter: 1, maxIncomingConnections: 1 })
```

The default `maxIncomingConnections` is 1,000,000 (unlimited in practice - OS limits apply).

## Step 2: Set maxIncomingConnections at Runtime

Change without restart (MongoDB 4.4+):

```javascript
db.adminCommand({ setParameter: 1, maxIncomingConnections: 5000 })
```

Verify:
```javascript
db.adminCommand({ getParameter: 1, maxIncomingConnections: 1 })
// { maxIncomingConnections: 5000, ok: 1 }
```

## Step 3: Set maxIncomingConnections in mongod.conf

For persistent configuration:

```yaml
# /etc/mongod.conf
net:
  maxIncomingConnections: 5000
  port: 27017
  bindIp: 0.0.0.0
```

Restart to apply:
```bash
sudo systemctl restart mongod
```

## Step 4: Understand OS Connection Limits

The OS limits file descriptors, which constrains connections. Check and increase:

```bash
# Check current limit
ulimit -n

# Increase for the mongod user (requires root)
echo "mongod soft nofile 65536" >> /etc/security/limits.conf
echo "mongod hard nofile 65536" >> /etc/security/limits.conf

# Or in /etc/systemd/system/mongod.service.d/override.conf
[Service]
LimitNOFILE=65536
```

Reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart mongod
```

## Step 5: Configure Driver Connection Pools

Set appropriate pool sizes on each application server. Too large wastes resources; too small creates queuing:

```javascript
// Node.js driver - recommended for most apps
const client = new MongoClient(uri, {
  maxPoolSize: 50,        // Max connections per client instance (default: 100)
  minPoolSize: 10,        // Keep 10 connections warm
  maxIdleTimeMS: 60000,   // Close idle connections after 60s
  waitQueueTimeoutMS: 5000  // Timeout if no connection available in 5s
});
```

```python
# PyMongo
from pymongo import MongoClient

client = MongoClient(
    os.environ["MONGODB_URI"],
    maxPoolSize=50,
    minPoolSize=10,
    maxIdleTimeMS=60000,
    waitQueueTimeoutMS=5000
)
```

## Step 6: Calculate maxIncomingConnections

Formula:
```text
maxIncomingConnections >= (number of app servers) * (maxPoolSize per server)
                        + (number of replica set members - 1)  # internal replication connections
                        + monitoring/tooling connections
                        + buffer (20%)
```

Example:
```text
App servers: 10
Pool per server: 50 connections
Internal connections: 4 (secondaries + arbiter)
Monitoring: 10
Buffer: 20%

Required: (10 * 50) + 4 + 10 = 514 -> set to 620 (514 * 1.2)
```

## Step 7: Set maxIncomingConnections for WiredTiger Memory

Each connection uses ~1MB of thread stack plus memory for in-progress operations. With a 16GB server:

```text
WiredTiger cache: 7.5GB (50% of (RAM - 1GB))
OS + MongoDB overhead: 4GB
Connection memory budget: 4.5GB

4608MB / 1MB per connection = ~4500 max safe connections
```

Set `maxIncomingConnections` below this threshold.

## Step 8: Monitor Connection Health

```javascript
// Create a monitoring script
const stats = db.serverStatus();
const conns = stats.connections;
const utilization = (conns.current / (conns.current + conns.available)) * 100;

print(`Connection utilization: ${utilization.toFixed(1)}%`);
print(`Current: ${conns.current}, Available: ${conns.available}`);

if (utilization > 80) {
  print("WARNING: High connection utilization - consider scaling app pool or increasing maxIncomingConnections");
}
```

## Atlas Connection Limits by Tier

On Atlas, `maxIncomingConnections` is set based on cluster tier:

| Tier | Max Connections |
|---|---|
| M10 | 1500 |
| M20 | 3000 |
| M30 | 3000 |
| M40 | 6000 |
| M60 | 32000 |
| M80 | 96000 |

You cannot increase beyond the tier limit on Atlas - upgrade the tier if needed.

## Summary

Tune `maxIncomingConnections` by calculating the total connections needed across all application servers using their pool sizes, then add buffer for internal and monitoring connections. Set the limit in `mongod.conf` for persistence or use `setParameter` for live changes. Configure driver pool sizes conservatively (50 connections per app instance is a good starting point), ensure OS file descriptor limits are raised to support the connection count, and monitor `db.serverStatus().connections` to track utilization.
