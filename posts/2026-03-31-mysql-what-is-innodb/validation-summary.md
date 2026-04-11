# Validation Summary: What Is InnoDB in MySQL

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- MySQL
- InnoDB storage engine
- SQL (DDL and DML)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Storage Engine: https://dev.mysql.com/doc/refman/8.0/en/innodb-storage-engine.html
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual — Clustered and Secondary Indexes: https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html
- MySQL 8.0 Reference Manual — InnoDB Recovery: https://dev.mysql.com/doc/refman/8.0/en/innodb-recovery.html
- MySQL 8.0 Reference Manual — Foreign Key Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — SHOW ENGINE Statement: https://dev.mysql.com/doc/refman/8.0/en/show-engine.html

## Issues Found
No technical issues found.

## Review Notes
- The term "bookmark lookup" on line 45 is more commonly associated with SQL Server terminology. In MySQL/InnoDB documentation, this process is typically described as a "clustered index lookup" following a secondary index scan. The description itself is accurate — secondary indexes do store the primary key and a second lookup is required — but readers familiar with MySQL-specific terminology may find "bookmark lookup" unfamiliar. This is a minor terminology choice, not an error.
- NDB Cluster (MySQL Cluster 7.3+) also supports foreign keys, but the post's qualifier "only commonly-used MySQL storage engine" is accurate since NDB is a niche engine.
