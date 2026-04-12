# Validation Summary: How to Compare MongoDB vs Cassandra for Scalability

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB (sharded cluster architecture, WiredTiger storage engine, mongos router, transactions)
- Apache Cassandra (peer-to-peer ring topology, LSM tree storage, CQL, lightweight transactions)
- MongoDB Atlas
- Amazon Keyspaces, DataStax Astra DB

## Sources Consulted
- MongoDB Sharding Architecture documentation: https://www.mongodb.com/docs/manual/sharding/
- MongoDB WiredTiger concurrency documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/#concurrency
- MongoDB `sh.enableSharding()` deprecation notice (deprecated in 6.0, removed in 8.0): https://www.mongodb.com/docs/manual/reference/method/sh.enableSharding/
- MongoDB `sh.shardCollection()` documentation: https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB multi-document transactions: https://www.mongodb.com/docs/manual/core/transactions/
- Apache Cassandra architecture (peer-to-peer, gossip protocol): https://cassandra.apache.org/doc/latest/cassandra/architecture/
- Apache Cassandra consistency levels (including SERIAL): https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- Apache Cassandra lightweight transactions (LWT / Paxos): https://cassandra.apache.org/doc/latest/cassandra/developing/cql/lwt.html
- Cassandra write path (memtable, SSTable, LSM tree): https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html

## Issues Found

1. **Mermaid diagram was architecturally incorrect**: The diagram showed a "Primary node" sitting between `mongos` and the shards, implying a single primary coordinates all shards. In MongoDB's actual sharded cluster architecture, the `mongos` router communicates directly with each shard. Fixed the diagram to show `mongos` routing directly to Shard 1/2/3 replica sets.

2. **Architecture description was misleading**: The text stated "a primary shard handles writes" which conflates the replica set primary within each shard with the overall sharding architecture. Rewrote to clarify that `mongos` routes to shards, and each shard is a replica set with its own primary.

3. **"WiredTiger lock" claim was inaccurate**: The Write Throughput table stated MongoDB single-node writes are "limited by WiredTiger lock." WiredTiger uses document-level concurrency control, not a single lock. Changed to "document-level concurrency."

4. **Cassandra write conflict resolution was wrong**: The table listed "Tunable consistency" as Cassandra's conflict resolution mechanism. Tunable consistency governs how many replicas must acknowledge a read/write, not how conflicts are resolved. Cassandra uses timestamp-based last-write-wins for conflict resolution. Fixed to "Last write wins (timestamp-based)."

5. **"more locking" claim for WiredTiger was misleading**: The paragraph described WiredTiger as involving "more locking for write-heavy workloads." Since WiredTiger uses document-level concurrency (not heavy locking), changed to "more overhead than append-only writes."

6. **`sh.enableSharding()` is deprecated/removed**: The MongoDB sharding code example called `sh.enableSharding("myapp")`, which was deprecated in MongoDB 6.0 (became a no-op) and removed in MongoDB 8.0. Removed this call since `sh.shardCollection()` alone is sufficient in current versions.

7. **Cassandra linearizable reads claim was incorrect**: The Consistency Models table stated Cassandra does "Not natively supported" linearizable reads. This is wrong -- Cassandra supports linearizable reads via the SERIAL and LOCAL_SERIAL consistency levels used with lightweight transactions (LWT). Fixed to "Yes (SERIAL consistency with LWT)."

## Review Notes
- The MongoDB election failover time of "10-30 seconds" is a reasonable range, though MongoDB 4.2+ with default `electionTimeoutMillis` of 10 seconds typically completes elections in under 12 seconds. The stated range is acceptable for a general comparison.
- The post does not specify MongoDB or Cassandra versions. The fixes align with current stable releases (MongoDB 7.x/8.x, Cassandra 4.x/5.x).
- The comparison is fair and balanced overall, with appropriate "when to choose" guidance for each database.
