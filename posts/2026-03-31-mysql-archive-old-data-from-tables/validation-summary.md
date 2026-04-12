# Validation Summary: How to Archive Old Data from MySQL Tables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB, ARCHIVE storage engine, partitioning)
- Percona Toolkit (pt-archiver)
- Python (mysql-connector-python)
- SQL DDL (CREATE TABLE, ALTER TABLE, PARTITION BY RANGE COLUMNS)

## Sources Consulted
- [MySQL 8.0 Reference Manual: The ARCHIVE Storage Engine](https://dev.mysql.com/doc/refman/8.0/en/archive-storage-engine.html)
- [MySQL 8.4 Reference Manual: The ARCHIVE Storage Engine](https://dev.mysql.com/doc/refman/8.4/en/archive-storage-engine.html)
- [MySQL 8.0 Reference Manual: ALTER TABLE Partition Operations](https://dev.mysql.com/doc/refman/8.0/en/alter-table-partition-operations.html)
- [MySQL 8.0 Reference Manual: The JSON Data Type](https://dev.mysql.com/doc/refman/8.0/en/json.html)
- [MySQL 5.7 Reference Manual: Management of RANGE and LIST Partitions](https://dev.mysql.com/doc/refman/5.7/en/partitioning-management-range-list.html)
- Percona Toolkit pt-archiver documentation (flags: --source, --dest, --where, --limit, --commit-each, --sleep, --no-check-charset, --progress, --purge)

## Issues Found
No technical issues found.

## Review Notes
- The description of DROP PARTITION as "a metadata operation" is a common simplification. In InnoDB with file-per-table, dropping a partition also removes the underlying .ibd tablespace file, making it a file-system operation — but it is still orders of magnitude faster than row-by-row deletion and completes near-instantly for practical purposes. This phrasing is standard in MySQL community documentation and acceptable.
- The Python script does not wrap the INSERT + DELETE across two connections in a distributed transaction, meaning a crash between them could leave duplicated rows. The use of INSERT IGNORE mitigates this for re-runs, and this trade-off is standard for archiving scripts. Not an error, but worth noting.
- The Python script creates new cursor objects each loop iteration without closing them. Functionally correct but could be improved for long-running jobs. Not a correctness issue for a tutorial example.
