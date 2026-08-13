# Validation Summary: Table Partitioning vs Sharding: Choose the Right Failure Domain

## Status

validated

## Post Type

Technical architecture and database-scaling guide

## Technologies Covered

- PostgreSQL declarative table partitioning, partition pruning, indexes, constraints, and high availability
- MySQL 8.4 InnoDB partitioning, partition pruning, constraints, and replication
- Apache Cassandra consistent hashing, token ranges, replication strategies, and tunable consistency
- Database sharding, replication, failure domains, resharding, and online data migration

## Sources Consulted

- [PostgreSQL 18: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL 18: High Availability, Load Balancing, and Replication](https://www.postgresql.org/docs/current/high-availability.html)
- [PostgreSQL 18: Log-Shipping Standby Servers](https://www.postgresql.org/docs/current/warm-standby.html)
- [PostgreSQL 18: Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [MySQL 8.4: Overview of Partitioning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-overview.html)
- [MySQL 8.4: Partition Pruning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html)
- [MySQL 8.4: InnoDB and MySQL Replication](https://dev.mysql.com/doc/refman/8.4/en/innodb-and-mysql-replication.html)
- [MySQL 8.4: Partitioning Limitations Relating to Storage Engines](https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-storage-engines.html)
- [MySQL 8.4: Partitioning Keys, Primary Keys, and Unique Keys](https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-partitioning-keys-unique-keys.html)
- [MySQL 8.4: NDB Cluster Nodes, Node Groups, Fragment Replicas, and Partitions](https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster-nodes-groups.html)
- [Apache Cassandra: Dynamo Architecture](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [Apache Cassandra: CQL Data Definition and Partition Keys](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html#partition-key)
- [Microsoft Azure Architecture Center: Sharding Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/sharding)

## Issues Found

1. **The shard definition implied dedicated infrastructure and failure isolation.** Logical shards do not require a one-to-one mapping to servers; multiple shards can share one storage node. The definition now describes a shard as independently routable and separately placeable, making clear that dedicated compute, storage, and recovery paths are deployment choices rather than inherent properties.
2. **The MySQL locality claim was too broad.** MySQL 8.4 supports both InnoDB and NDB, and NDB Cluster automatically distributes partition fragments and replicas across data nodes. The post now explicitly scopes its local-partitioning comparison to MySQL InnoDB and describes the conclusion as applying to local table partitioning.
3. **The decision table overstated constraint preservation.** Partitioned PostgreSQL `UNIQUE` and `PRIMARY KEY` constraints must include every partition-key column, with related limits on exclusion constraints. MySQL requires every unique key to include all partition-expression columns, and user-partitioned InnoDB tables cannot participate in foreign-key relationships. The table now says joins remain local while constraints have partitioning limits.
4. **The live-migration requirement was unconditional.** A migration can instead pause writes for a tenant during copy and cutover. The post now limits its duplicate-write or change-capture requirement to migrations that keep source writes available during that interval.
5. **The Cassandra data-replication link used a nonexistent fragment.** The `#data-replication` fragment was replaced with the current `#replication-strategy` fragment, which points directly to the documented keyspace and rack/datacenter replica-placement behavior.

## Review Notes

- The PostgreSQL DDL is valid. Its primary key includes `occurred_at`, as required because `occurred_at` is the partition key. The example was also executed successfully on PostgreSQL 14.17; an inserted August 2026 row was routed to `events_2026_08`.
- PostgreSQL's current documentation is version 18 as of the validation date. The example uses established declarative-partitioning syntax and remains current.
- PostgreSQL interprets the untyped `timestamptz` partition-bound literals in the session time zone when the partition is created. The example is valid, but deployments intending UTC calendar-month boundaries may prefer explicit offsets.
- Dropping a PostgreSQL partition takes an `ACCESS EXCLUSIVE` lock on the parent. `DETACH PARTITION ... CONCURRENTLY` can reduce the parent lock level but has documented restrictions. This does not invalidate the post's statement that partition removal avoids the row-by-row and vacuum cost of bulk `DELETE`.
- Cassandra sends writes to all replicas for a key; the selected consistency level controls how many acknowledgements the coordinator waits for. Consistent hashing does not subdivide a single hot partition key, so the hot-key warning is correct.
- All cited documentation pages resolve, and the remaining PostgreSQL, MySQL, Cassandra, sharding, replication, and failure-domain claims are technically consistent with the official sources above.
