# Validation Summary: MySQL vs CockroachDB: Distributed SQL Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MySQL (InnoDB, InnoDB Cluster, Galera)
- CockroachDB (Raft consensus, distributed SQL, multi-region)
- Vitess (mentioned for MySQL horizontal scaling)
- PostgreSQL wire protocol (CockroachDB compatibility layer)

## Sources Consulted
- CockroachDB official docs: Start a Local Cluster (https://www.cockroachlabs.com/docs/stable/start-a-local-cluster.html)
- CockroachDB official docs: cockroach start command reference (https://www.cockroachlabs.com/docs/stable/cockroach-start.html)
- CockroachDB official docs: Multi-Region Capabilities / Table Localities (https://www.cockroachlabs.com/docs/stable/multiregion-overview.html)
- CockroachDB official docs: Transaction isolation levels (https://www.cockroachlabs.com/docs/stable/transactions.html)
- MySQL official docs: SELECT LIMIT syntax (https://dev.mysql.com/doc/refman/8.0/en/select.html)
- MySQL official docs: InnoDB and ACID compliance (https://dev.mysql.com/doc/refman/8.0/en/mysql-acid.html)
- MySQL official docs: InnoDB Cluster (https://dev.mysql.com/doc/refman/8.0/en/mysql-innodb-cluster-introduction.html)

## Issues Found

1. **CockroachDB cluster startup commands missing `--join` on first node and `--http-addr` on all nodes.**
   - **What was wrong:** The first node was started without `--join`, and none of the nodes specified `--http-addr`. In modern CockroachDB (v21.1+), all nodes should use `--join` listing all initial node addresses. Without distinct `--http-addr` values, nodes 2 and 3 would encounter port conflicts on the default HTTP port 8080.
   - **What was changed:** Added `--join=localhost:26257,localhost:26258,localhost:26259` to all three nodes and added `--http-addr=localhost:8080`, `--http-addr=localhost:8081`, and `--http-addr=localhost:8082` respectively.
   - **Why:** Matches the current recommended startup pattern from CockroachDB official documentation and prevents HTTP port binding failures.

2. **Misleading comment on LIMIT/OFFSET syntax.**
   - **What was wrong:** The comment `-- CockroachDB supports PostgreSQL-style syntax` for `SELECT * FROM users LIMIT 10 OFFSET 20` implied this syntax is PostgreSQL-specific. MySQL also supports `LIMIT ... OFFSET ...` syntax — it is standard SQL.
   - **What was changed:** Changed comment to `-- Standard LIMIT/OFFSET syntax (supported by both MySQL and CockroachDB)` and clarified the MySQL-specific line as `-- MySQL-specific comma syntax (not supported in CockroachDB)`.
   - **Why:** The `LIMIT x OFFSET y` form is supported by both databases. Only the `LIMIT offset, count` comma syntax is MySQL-specific.

## Review Notes
- The claim that MySQL's "Serializable distributed transactions" is "No" in the comparison table is fair. While MySQL supports XA transactions, they do not provide the same seamless serializable distributed guarantees that CockroachDB offers by default.
- The post correctly identifies CockroachDB as PostgreSQL-wire-compatible, not MySQL-compatible.
- The `ALTER TABLE ... SET LOCALITY REGIONAL BY ROW` syntax is valid CockroachDB multi-region SQL.
- CockroachDB's default isolation level is indeed SERIALIZABLE, which is accurately stated.
- The post could mention MySQL NDB Cluster as another horizontal scaling option besides Vitess, but omitting it is not an error — Vitess is the most widely adopted solution for MySQL sharding.
