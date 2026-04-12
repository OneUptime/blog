# How to Use mongos as a Query Router in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Mongos, Query Routing, Database

Description: Learn how mongos routes queries in a MongoDB sharded cluster, how to configure it, and how to optimize query routing for targeted versus broadcast operations.

---

`mongos` is the query router for MongoDB sharded clusters. Applications connect to `mongos` rather than individual shards, and `mongos` transparently routes operations to the correct shard or shards based on the shard key.

## Configuring mongos

Create a configuration file for `mongos`:

```yaml
# /etc/mongos.conf
sharding:
  configDB: configReplSet/cfg1.example.com:27019,cfg2.example.com:27019,cfg3.example.com:27019
net:
  port: 27017
  bindIp: 0.0.0.0
systemLog:
  destination: file
  path: /var/log/mongodb/mongos.log
  logAppend: true
```

Start `mongos`:

```bash
mongos --config /etc/mongos.conf
```

## How Query Routing Works

When a query includes the shard key, `mongos` performs a targeted query - it contacts only the shard(s) that hold the relevant chunks. Without the shard key, `mongos` broadcasts to all shards (scatter-gather).

Connect to `mongos` and run `explain()` to see routing behavior:

```javascript
// Targeted query (includes shard key)
db.orders.find({ customerId: "C123" }).explain("executionStats")

// Check winningPlan.shards - targeted query hits 1 shard
// Broadcast query hits all shards
db.orders.find({ status: "pending" }).explain("executionStats")
```

## Verifying Shard Routing

Use `explain()` output to identify whether a query is targeted:

```javascript
const plan = db.orders.find({ customerId: "C123" }).explain()
print(plan.queryPlanner.winningPlan.shards.length) // 1 = targeted
```

## Running Administrative Commands via mongos

Most administrative commands are routed through `mongos`:

```javascript
// List all shards
sh.status()

// Shard a collection
sh.shardCollection("myapp.orders", { customerId: 1 })

// Check balancer status
sh.getBalancerState()
```

## Managing mongos in Production

Run multiple `mongos` instances for high availability. Applications should connect to a load balancer or specify multiple `mongos` hosts in their connection string:

```text
mongodb://mongos1.example.com:27017,mongos2.example.com:27017/myapp
```

Do not include the `replicaSet` parameter when connecting to `mongos` - it is not a replica set member itself.

## Monitoring mongos Performance

Check slow operations via the `mongos` log or using `currentOp`:

```javascript
// From mongos shell
db.adminCommand({ currentOp: true, secs_running: { $gte: 5 } })
```

Check the number of chunks for a collection via the config database:

```javascript
use config
db.collections.find({ _id: "myapp.orders" }, { uuid: 1 })
// Use the returned uuid to query chunks
db.chunks.countDocuments({ uuid: UUID("...") })
```

## Connection Pooling

Tune connection pool settings in `mongos` for high-throughput applications:

```yaml
# In /etc/mongos.conf
net:
  maxIncomingConnections: 65536
```

Applications should set an appropriate `maxPoolSize` in their driver connection string.

## Summary

`mongos` acts as the transparent gateway between applications and a MongoDB sharded cluster. Targeted queries that include the shard key are routed to a single shard; queries without the shard key are broadcast to all shards. Run multiple `mongos` instances for availability and monitor routing behavior with `explain()` to ensure queries are targeting the right shards.
