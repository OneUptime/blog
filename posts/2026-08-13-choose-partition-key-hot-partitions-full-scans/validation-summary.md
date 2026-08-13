# Validation Summary: How to Choose a Partition Key Without Hot Partitions or Full Scans

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- PostgreSQL declarative range and hash partitioning
- PostgreSQL partition pruning, partitioned indexes, constraints, and `EXPLAIN`
- Apache Cassandra and Cassandra Query Language (CQL)
- Cassandra partition keys, clustering columns, token routing, virtual nodes, and bucketing
- Cassandra `nodetool getendpoints` and `nodetool tablestats`
- MySQL partitioned-table unique-key constraints
- Partition-key salting, workload skew, query fan-out, and retention design

## Sources Consulted

- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL: Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [PostgreSQL: Partitioning Best Practices](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-BEST-PRACTICES)
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL: EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [PostgreSQL: PREPARE](https://www.postgresql.org/docs/current/sql-prepare.html)
- [PostgreSQL: Aggregate Functions](https://www.postgresql.org/docs/current/functions-aggregate.html)
- [Apache Cassandra: CQL Data Definition](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html)
- [Apache Cassandra: CQL Data Types](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/types.html)
- [Apache Cassandra: CQL Data Manipulation](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/dml.html)
- [Apache Cassandra: Data Modeling Introduction](https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/intro.html)
- [Apache Cassandra: Evaluating and Refining Data Models](https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/data-modeling_refining.html)
- [Apache Cassandra: Dynamo Architecture, Tokens, and Virtual Nodes](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [Apache Cassandra: ALTER TABLE](https://cassandra.apache.org/doc/latest/cassandra/reference/cql-commands/alter-table.html)
- [Apache Cassandra: `nodetool getendpoints`](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/getendpoints.html)
- [Apache Cassandra: `nodetool tablestats`](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/tablestats.html)
- [Apache Cassandra: Metrics](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/metrics.html)
- [MySQL 8.4: Partitioning Keys, Primary Keys, and Unique Keys](https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations-partitioning-keys-unique-keys.html)

## Issues Found

- The Cassandra `CREATE TABLE` example used PostgreSQL syntax: CQL does not support column-level `NOT NULL`, and `timestamptz` is not a CQL data type. Removed the `NOT NULL` modifiers and changed `occurred_at` to CQL's `timestamp` type. The composite partition key and clustering-column definition were retained because they are valid.
- The opening timestamp claim applied range-partitioning behavior to both database engines. Qualified it with “With range partitioning” because PostgreSQL range partitioning concentrates current timestamps in the active range, whereas Cassandra hashes partition-key values onto the token ring.
- The cross-engine definition described every PostgreSQL partition as local and described a Cassandra partition only as a placement unit. Replaced it with the precise concepts: a table attached to a PostgreSQL partitioned table, and rows sharing a Cassandra partition-key value on one replica set.
- The PostgreSQL range-partitioning example created only the storage-less partitioned parent, so it did not yet define a usable time bucket. Added a representative August 2026 child partition with typed, half-open bounds.
- The Cassandra bucketing tradeoff was called “application fan-out,” although Cassandra can perform some multi-partition reads through the coordinator. Changed it to the implementation-neutral “read fan-out.”
- The PostgreSQL hash-partitioning wording called the selected leaf local even though PostgreSQL can use foreign tables as partitions. Changed it to “one leaf partition”; the separate statement about distribution by surrounding architecture remains accurate.
- The salting guidance said changing from modulo 16 to modulo 32 always remaps existing values. Changed this to “can map” because only some hash results move to a different numeric bucket.
- The Cassandra primary key was described as entirely immutable, overlooking permitted clustering-column renames. Clarified that primary-key composition and column types cannot be changed with `ALTER TABLE`; changing the partition key still requires a new table and data migration.
- The `nodetool getendpoints` description referred to generic keys. Clarified that its key argument identifies a specific partition key.
- The scorecard implied that tenant-plus-month bucketing bounds traffic and that time-then-tenant hashing splits a hot tenant. It also used object count as a fan-out value. Qualified the candidates by database engine and corrected the cells to distinguish bounded data growth from traffic skew, show that a hot tenant stays in one hash leaf per time bucket, and describe global-read hash-leaf fan-out.

## Review Notes

The corrected PostgreSQL DDL and both PostgreSQL query examples executed successfully on PostgreSQL 14.17 after creating the recommended index and inserting a representative row; they were also cross-checked against the current PostgreSQL 18 documentation. PostgreSQL pruning remains correctly described as being driven by partition bounds rather than indexes. The corrected Cassandra schema has `(tenant_id, month_start)` as its composite partition key and `occurred_at, event_id` as clustering columns. The Cassandra query-driven modeling, vnode, replica-placement, bucketing, and command descriptions are otherwise accurate. The MySQL unique-key rule is also correct. All external links in the post resolved to their intended documentation or author page during review. No database versions are pinned in the article; validation used the current PostgreSQL 18 and Apache Cassandra 5.0 documentation plus the supported MySQL 8.4 manual.
