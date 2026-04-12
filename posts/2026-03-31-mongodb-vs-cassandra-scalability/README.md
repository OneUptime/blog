# How to Compare MongoDB vs Cassandra for Scalability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cassandra, Comparison, Scalability, NoSQL

Description: Compare MongoDB and Cassandra across write throughput, horizontal scaling, consistency models, and operational complexity to choose the right database for your workload.

---

## Architecture Comparison

MongoDB and Cassandra take fundamentally different approaches to scalability:

```mermaid
flowchart LR
    subgraph MongoDB
        MongoS[mongos router] --> Shard1[Shard 1 replica set]
        MongoS --> Shard2[Shard 2 replica set]
        MongoS --> Shard3[Shard 3 replica set]
    end

    subgraph Cassandra
        Node1[Node 1] <--> Node2[Node 2]
        Node2 <--> Node3[Node 3]
        Node3 <--> Node4[Node 4]
        Node4 <--> Node1
        Cassandra[Peer-to-peer ring topology]
    end
```

MongoDB uses a sharded cluster architecture where a `mongos` router directs queries to the appropriate shard. Each shard is a replica set with its own primary that handles writes and secondaries that provide read scaling and failover. Cassandra uses a leaderless peer-to-peer ring where any node can accept writes, providing higher write availability.

## Write Throughput

| Scenario | MongoDB | Cassandra |
|---|---|---|
| Single node writes | High (document-level concurrency) | High (append-only memtables) |
| Multi-shard writes | Scales linearly with shards | Scales linearly with nodes |
| Write availability | Primary must be available | Any node can accept writes |
| Write conflict resolution | Last write wins on primary | Last write wins (timestamp-based) |
| Write amplification | Oplog replication overhead | Gossip + compaction overhead |

Cassandra is designed for write-heavy workloads. Its log-structured storage engine (memtable + SSTable) accepts writes at memory speed before flushing to disk. MongoDB's WiredTiger engine uses B-tree storage with journaling, which is efficient but involves more overhead than append-only writes for write-heavy workloads on a single shard.

## Horizontal Scaling Comparison

**MongoDB scaling** adds shards (each shard is a replica set):

```javascript
// Shard a collection by hashed customerId
sh.shardCollection("myapp.orders", { customerId: "hashed" })

// Check shard distribution
sh.status()
```

**Cassandra scaling** adds nodes to the ring:

```bash
# Add a new Cassandra node - it joins the ring automatically
# after setting seeds in cassandra.yaml
cassandra -f

# Check token distribution
nodetool status
```

Cassandra's elastic scaling is generally simpler: add a node and it automatically acquires token ranges from existing nodes. MongoDB sharding requires careful shard key selection upfront and shard key changes are complex.

## Consistency Models

| Feature | MongoDB | Cassandra |
|---|---|---|
| Default consistency | Strong (primary reads) | Eventual (ONE) |
| Tunable reads | Yes (read preferences) | Yes (ONE, QUORUM, ALL) |
| Tunable writes | Yes (write concern) | Yes (ONE, QUORUM, ALL) |
| ACID transactions | Multi-document, multi-collection | Lightweight transactions (LWT, limited) |
| Linearizable reads | Yes (linearizable read concern) | Yes (SERIAL consistency with LWT) |

MongoDB provides multi-document ACID transactions, which Cassandra does not support across partitions. If your workload requires complex transactions, MongoDB is the better choice.

```javascript
// MongoDB multi-document transaction
const session = client.startSession();
session.startTransaction();
try {
  await db.orders.insertOne({ orderId: "o1", amount: 99 }, { session });
  await db.inventory.updateOne(
    { productId: "p1" },
    { $inc: { stock: -1 } },
    { session }
  );
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
}
```

## Query Flexibility

| Feature | MongoDB | Cassandra |
|---|---|---|
| Secondary indexes | Rich (compound, text, geo, sparse) | Limited (secondary indexes are expensive) |
| Ad-hoc queries | Fully supported | Requires table-per-query-pattern design |
| Aggregation | Rich pipeline ($group, $lookup, $unwind) | Not supported natively (use Spark or DSE) |
| Full-text search | Atlas Search or text indexes | Not supported natively |
| Joins | $lookup aggregation stage | Not supported |

Cassandra requires you to design a table for each access pattern. Adding a new query pattern often requires a new table (materialized view). MongoDB allows ad-hoc queries on any field with secondary indexes.

## Failure Handling

**MongoDB**: A primary failure triggers an automatic election (typically 10-30 seconds). During the election, the replica set is unavailable for writes.

**Cassandra**: With replication factor 3 and QUORUM consistency, the cluster tolerates one node failure with no downtime because any two nodes can form a quorum.

For applications that require continuous write availability during node failures, Cassandra's leaderless model is a better fit.

## Operational Complexity

| Aspect | MongoDB | Cassandra |
|---|---|---|
| Managed cloud service | MongoDB Atlas (excellent) | Amazon Keyspaces, Astra DB |
| Self-hosted operations | Moderate (replica sets, mongos) | Complex (compaction tuning, GC pressure) |
| Schema migration | Flexible (no ALTER TABLE) | Flexible (CQL ALTER TABLE for columns) |
| Monitoring | Atlas Performance Advisor | nodetool, JMX, Prometheus exporter |

## When to Choose Cassandra

- Write-heavy IoT or time-series workloads needing millions of writes per second
- Active-active multi-datacenter deployments where continuous write availability is critical
- Workloads where a fixed set of access patterns is known at design time
- Teams comfortable with table-per-query-pattern design

## When to Choose MongoDB

- Applications requiring rich ad-hoc queries without pre-planning access patterns
- Workloads needing multi-document ACID transactions
- Document-centric data models with variable schemas
- Teams that need Atlas's managed service, Search, Triggers, and Data API
- Applications where operational simplicity outweighs maximum write throughput

## Summary

Cassandra excels at write-heavy, time-series workloads requiring active-active multi-datacenter availability. MongoDB excels at document workloads requiring flexible queries, aggregation, and multi-document ACID transactions. For most application development teams, MongoDB's managed Atlas service, rich query model, and operational simplicity make it the better default choice unless Cassandra's specific write availability or scale characteristics are required.
