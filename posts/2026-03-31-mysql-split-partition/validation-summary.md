# Validation Summary: How to Split a Partition in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (partitioning features: RANGE, LIST)
- ALTER TABLE ... REORGANIZE PARTITION
- INFORMATION_SCHEMA.PARTITIONS
- Percona pt-online-schema-change
- InnoDB storage engine

## Sources Consulted
- MySQL 8.0 Reference Manual — Partitioning Management (REORGANIZE PARTITION): https://dev.mysql.com/doc/refman/8.0/en/partitioning-management-range-list.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA PARTITIONS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-partitions-table.html
- MySQL 8.0 Reference Manual — Partition Pruning: https://dev.mysql.com/doc/refman/8.0/en/partitioning-pruning.html
- Percona Toolkit Documentation — pt-online-schema-change: https://docs.percona.com/percona-toolkit/pt-online-schema-change.html
- Percona Community Forums — Partitioning with pt-online-schema-change: https://forums.percona.com/t/partitioning-table-with-pt-online-schema-change/22640

## Issues Found
1. **Incorrect pt-online-schema-change example**: The original command `pt-online-schema-change --alter "REORGANIZE PARTITION p_old INTO (...)"` is incorrect. pt-online-schema-change does not support `REORGANIZE PARTITION` because it works by creating a new empty shadow table and applying the ALTER to it — there are no existing partitions to reorganize on the empty table. **Fix applied**: Replaced the command with the correct approach using `PARTITION BY` to define the full new partition layout from scratch, which is the documented workaround for repartitioning tables with pt-online-schema-change. Also added a comment clarifying this limitation.

## Review Notes
- All SQL syntax for CREATE TABLE with partitions, REORGANIZE PARTITION for RANGE and LIST types, and the INFORMATION_SCHEMA query is correct and verified against MySQL 8.0 documentation.
- Primary keys correctly include the partition columns (event_ts, log_date, country_code), which is required by MySQL for partitioned tables.
- The REORGANIZE PARTITION examples correctly maintain contiguous RANGE boundaries and complete LIST value coverage, matching MySQL's requirements.
- The "Key Rules for Splitting" section accurately describes MySQL's constraints on REORGANIZE PARTITION.
- The performance discussion correctly notes that REORGANIZE PARTITION copies all rows in the affected partition(s), which is accurate — MySQL performs this as an ALGORITHM=COPY operation internally.
