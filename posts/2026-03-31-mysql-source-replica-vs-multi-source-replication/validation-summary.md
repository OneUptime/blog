# Validation Summary: MySQL Source-Replica vs Multi-Source Replication

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL replication (source-replica topology)
- MySQL multi-source replication
- MySQL GTID-based replication
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: Replication — https://dev.mysql.com/doc/refman/8.0/en/replication.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: SHOW BINARY LOG STATUS — https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- MySQL 8.0 Reference Manual: Multi-Source Replication — https://dev.mysql.com/doc/refman/8.0/en/replication-multi-source.html
- MySQL 8.0 Reference Manual: GTID Concepts — https://dev.mysql.com/doc/refman/8.0/en/replication-gtids-concepts.html
- MySQL 8.0 Reference Manual: Performance Schema Replication Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-tables.html

## Issues Found
- **Incorrect legacy terminology**: The post stated "Source-replica (formerly primary-replica)" but MySQL's historical terminology was "master-slave", not "primary-replica". The term "primary-replica" is associated with other databases like PostgreSQL, not MySQL. MySQL officially changed from "master/slave" to "source/replica" in MySQL 8.0.23. Changed "formerly primary-replica" to "formerly master-slave".

## Review Notes
- The post uses the modern MySQL 8.0.23+ syntax (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`) throughout, which is correct and current. The older deprecated equivalents (`CHANGE MASTER TO`, `START SLAVE`, `SHOW SLAVE STATUS`) are not used.
- `SHOW BINARY LOG STATUS` was introduced in MySQL 8.2.0, while `CHANGE REPLICATION SOURCE TO` was introduced in MySQL 8.0.23. The post doesn't specify a target MySQL version, so mixing these modern commands is acceptable, but readers on MySQL 8.0.x (before 8.2) would need to use `SHOW MASTER STATUS` instead.
- All SQL syntax, parameter names, Performance Schema table/column references, and version claims are accurate.
