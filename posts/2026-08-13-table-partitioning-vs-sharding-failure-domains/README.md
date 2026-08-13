# Table Partitioning vs Sharding: Choose the Right Failure Domain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, MySQL, Database Partitioning, Database Sharding, Scalability, Reliability

Description: Decide whether a large table needs local partition management or distributed capacity and fault isolation by measuring bottlenecks, query routing, and failure requirements.

---

Table partitioning and sharding both divide data, but they solve different classes of problem. In the local partitioning model discussed here, a partitioned PostgreSQL or MySQL InnoDB table is still one logical database table managed by one database server or cluster. A shard is an independently routable subset of a dataset that can be placed on separate compute and storage and given its own operational and recovery path.

That distinction matters more than row count. If one server has enough capacity but retention deletes, index maintenance, or time-bounded queries are painful, local partitioning may be exactly right. If the working set, write rate, recovery objective, or tenant-isolation requirement exceeds one database failure domain, another child table does not create the missing capacity or isolation.

## Define the Boundary Before Choosing the Mechanism

In PostgreSQL declarative partitioning, the partitioned parent has no storage; rows live in ordinary child tables and the server routes them by partition key. MySQL InnoDB likewise treats partitions as parts of one table, and partitioning applies to the table's data and indexes. Both engines can prune partitions when a predicate proves that some partitions cannot match.

None of that inherently moves a child to an independent database server. A host outage, storage failure, overloaded buffer pool, or exhausted connection limit can still affect the whole database. Replication and high-availability architecture may protect that database, but the partition boundary itself is not the HA boundary.

Cassandra illustrates the distributed alternative. It hashes a partition key onto a token ring and places replicas according to the keyspace replication strategy. Nodes own token ranges; replicas may be placed across racks or data centers. That is closer to what application teams mean by sharding, although Cassandra performs distribution natively instead of requiring application-managed SQL shards.

Use precise language:

- **Table partition:** a physical subdivision below one logical table.
- **Shard:** an independently routable subset of a dataset that can be placed separately.
- **Replica:** another copy of data for availability or reads.
- **Failure domain:** the set of components that can fail together, such as a process, host, rack, zone, or region.

A design can use all three: each shard may be replicated and each shard's largest tables may be locally partitioned.

## Ask Which Limit You Are Hitting

Start with evidence. The following symptoms generally point toward local partitioning:

- most queries select a bounded time window or a small set of categories;
- old data is deleted in the same units in which it could be partitioned;
- bulk loading can be staged and attached;
- indexes or vacuum work are easier to manage as smaller child relations;
- one server still has acceptable CPU, memory, storage throughput, WAL capacity, and recovery time.

These symptoms point toward sharding or another distributed architecture:

- sustained writes exceed what a correctly tuned primary can absorb;
- the active working set cannot fit the desired storage or memory envelope on one database;
- backup, restore, crash recovery, or failover for the whole dataset misses its objective;
- tenants require independent placement, maintenance, encryption boundaries, or noisy-neighbor isolation;
- growth requires adding compute and storage nodes, not merely reorganizing files;
- regional data residency or latency requires independent writable placement.

Do not use a single utilization graph. A database can be at 90% CPU because of missing indexes, a bad join, or connection churn. Sharding that workload multiplies the same mistake. Conversely, a well-indexed primary that is capped by durable-write bandwidth has a genuine scale boundary that partition pruning cannot remove.

## What Local Partitioning Actually Buys

Suppose an events table is normally queried by time and retained for 180 days:

~~~sql
CREATE TABLE events (
    tenant_id bigint NOT NULL,
    event_id bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    payload jsonb NOT NULL,
    PRIMARY KEY (tenant_id, event_id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2026_08
PARTITION OF events
FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
~~~

PostgreSQL can prune unrelated month partitions for compatible time predicates. Retention can detach or drop an old partition instead of deleting rows individually, avoiding the vacuum work caused by a bulk delete. Indexes declared on the parent create corresponding indexes on partitions.

This improves data lifecycle and can reduce scanned data. It does not add another write coordinator, double the server's memory bandwidth, or make August survive the loss of the database host. The query below can also remain expensive if it has no time restriction:

~~~sql
SELECT count(*)
FROM events
WHERE tenant_id = 4242;
~~~

If time is the only partition key, every retained partition may be relevant. Partitioning helped the retention operation but not this access pattern. That is not a partitioning bug; it is a mismatch between the predicate and the physical design.

## What Sharding Adds and Charges For

A tenant-sharded application might route tenant 4242 to shard 7:

~~~text
tenant_id -> shard map -> database endpoint
                        -> locally partitioned events table
~~~

That endpoint can have its own CPU, storage, replicas, maintenance window, and recovery operation. Adding shards can add capacity. A failed shard can have a smaller blast radius than a single database holding every tenant, assuming the control plane, network, and dependencies are not shared single points of failure.

The price is distributed-systems work:

- routing metadata must be correct, available, and versioned;
- cross-shard joins, unique constraints, and transactions are no longer ordinary local operations;
- fan-out queries need deadlines, partial-failure behavior, and result merging;
- resharding needs copying, change capture, validation, and cutover;
- every shard needs schema rollout, backup, monitoring, and capacity management;
- skew can overload one shard even when aggregate capacity looks healthy.

Consistent hashing reduces key movement when membership changes, but it does not split one extremely busy key. Replication increases availability and sometimes read capacity, but all replicas still receive writes for that key. Distribution strategy and hot-key strategy are separate decisions.

## Use a Decision Test, Not a Row Threshold

Run representative measurements before changing architecture:

1. Capture query fingerprints, latency percentiles, rows read, buffers, temporary I/O, and write-ahead-log volume.
2. Measure the active working set and growth, not just total table bytes.
3. Test a partitioned copy with production-like partition counts and parameterized queries.
4. Estimate restore and failover duration from drills rather than backup size alone.
5. Model tenant or key skew at peak intervals.
6. State the required failure boundary explicitly: host, zone, tenant, or region.

A useful decision record separates requirements:

| Requirement | Partitioning | Sharding |
| --- | --- | --- |
| Prune old time ranges | Strong fit | Only if routing also encodes time |
| Drop a retention window quickly | Strong fit | Still useful inside each shard |
| Add aggregate write compute | No | Yes, when writes route independently |
| Isolate one tenant operationally | Weak by itself | Stronger with dedicated placement |
| Preserve local joins and constraints | Joins remain local; constraints have partitioning limits | Only within a shard |
| Reduce single-database recovery scope | No | Potentially, with independent shards |

## Prefer the Smallest Architecture That Meets the Boundary

If measurements show one database is viable, add a compatible composite index, repair query predicates, or partition for a concrete management or pruning benefit. These are operationally cheaper than a distributed topology.

If the requirement truly is a new failure or capacity domain, design shards deliberately. Pick a routing key from actual access patterns, decide how global identities are generated, define the behavior of cross-shard reads, and rehearse shard split and evacuation. Then use local partitioning inside each shard where it still improves retention or query locality.

Avoid presenting sharding as an irreversible big-bang migration. A tenant directory can first route all tenants to one endpoint, then gradually move selected tenants while the application already uses the routing abstraction. A migration that keeps source writes available during copying and cutover still needs duplicate-write or change-capture semantics, reconciliation, and a rollback point.

## Official Documentation

- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL: High Availability, Load Balancing, and Replication](https://www.postgresql.org/docs/current/high-availability.html)
- [PostgreSQL: Warm Standby](https://www.postgresql.org/docs/current/warm-standby.html)
- [MySQL 8.4: Overview of Partitioning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-overview.html)
- [MySQL 8.4: Partition Pruning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html)
- [MySQL 8.4: InnoDB and MySQL Replication](https://dev.mysql.com/doc/refman/8.4/en/innodb-and-mysql-replication.html)
- [Apache Cassandra: Dataset Partitioning and Consistent Hashing](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [Apache Cassandra: Data Replication](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html#replication-strategy)

## Conclusion

Local table partitioning is a table-layout and lifecycle tool; sharding is a distribution and operational-boundary decision. Choose partitioning when predicates, retention, loading, or maintenance align with a useful key and one database still meets capacity and recovery goals. Choose sharding when evidence says the system needs independently placeable compute, storage, recovery, or tenant boundaries. Often the durable answer is both: replicated shards for failure-domain control, with carefully chosen local partitions inside each shard.
