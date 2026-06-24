# Validation Summary: MySQL InnoDB Cluster vs NDB Cluster: Which to Choose

## Status
validated

## Post Type
Conceptual / Comparison

## Technologies Covered
- MySQL 8.0 InnoDB Cluster (Group Replication, MySQL Router, MySQL Shell)
- MySQL NDB Cluster 8.0 (NDB storage engine, SQL/data/management nodes)

## Sources Consulted
- MySQL 8.0 Reference Manual — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-overview.html (verified NDB is an in-memory, shared-nothing, no-single-point-of-failure clustered storage engine with SQL nodes = mysqld, data nodes = ndbd/ndbmtd, management nodes = ndb_mgmd)
- MySQL 8.0 Reference Manual — https://dev.mysql.com/doc/refman/8.0/en/mysql-cluster-limitations-syntax.html (verified foreign-key support and its restrictions, hidden primary key behavior for tables without an explicit PK, and TEXT/BLOB indexing/PK restrictions)

## Issues Found
- Fixed an incorrect NDB claim: the post stated "Tables without PRIMARY KEY are not supported in NDB." The manual states NDB automatically adds a hidden primary key when no explicit PK is defined (the real caveat is that you cannot have an AUTO_INCREMENT column with no key). Rewrote the comment to reflect the hidden-PK behavior and recommend explicit primary keys.
- Fixed an inaccurate foreign-key restriction example: the post said "no CASCADE across different data nodes," which is not a documented NDB restriction. Replaced it with a real one from the manual: "ON UPDATE CASCADE is not allowed when referencing the parent table's primary key."

## Review Notes
- Foreign-key support "since NDB 7.3" is correct — FK support was introduced in MySQL Cluster NDB 7.3.
- The TEXT/BLOB "cannot be primary key or indexed" claim is correct per the manual.
- InnoDB Cluster's three components (Group Replication, MySQL Router, MySQL Shell) and the MySQL Shell `dba.configureInstance` / `dba.createCluster` / `cluster.addInstance` / `cluster.status` AdminAPI flow are accurate.
- The consistency-model statements (Group Replication uses a Paxos-based consensus protocol; NDB uses two-phase commit across data nodes) and the `performance_schema.replication_group_members` query are correct.
- The 99.999% availability / sub-millisecond latency / telecom positioning for NDB matches Oracle's documented framing and was left as-is.
