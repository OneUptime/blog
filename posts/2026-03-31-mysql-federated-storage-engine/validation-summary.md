# Validation Summary: What Is the FEDERATED Storage Engine in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL FEDERATED storage engine
- MySQL CREATE SERVER statement
- MySQL storage engine configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual: FEDERATED Storage Engine (https://dev.mysql.com/doc/refman/8.0/en/federated-storage-engine.html)
- MySQL 8.0 Reference Manual: CREATE SERVER Statement (https://dev.mysql.com/doc/refman/8.0/en/create-server.html)
- MySQL 8.0 Reference Manual: FEDERATED Storage Engine Notes and Tips (https://dev.mysql.com/doc/refman/8.0/en/federated-usagenotes.html)
- MySQL 8.0 Reference Manual: CREATE TABLE ... CONNECTION (https://dev.mysql.com/doc/refman/8.0/en/federated-create-connection.html)

## Issues Found
No technical issues found.

## Review Notes
- The CONNECTION string format `mysql://user:password@host:port/db/table` is correct per MySQL documentation.
- The `CREATE SERVER` syntax with `FOREIGN DATA WRAPPER mysql` and the OPTIONS clause is accurate.
- The limitation about "no query pushdown optimization for complex queries" is slightly simplified. FEDERATED does push down simple WHERE conditions to the remote server, but complex operations (JOINs, subqueries involving FEDERATED tables) require fetching all data first. The "for complex queries" qualifier makes the statement acceptable.
- The FEDERATED engine is indeed disabled by default and requires the `federated` directive in the `[mysqld]` section of my.cnf to enable.
- The post correctly notes that FEDERATED does not support ALTER TABLE operations on the remote table.
- Additional limitations not mentioned (but not required for the scope of this post): no support for indexes that differ from the remote table, no partitioning support, and the engine is not available in MySQL NDB Cluster.
