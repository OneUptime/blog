# Validation Summary: How to Use Partitioning for Data Archival in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB engine)
- MySQL Table Partitioning (RANGE partitioning with TO_DAYS)
- MySQL EXCHANGE PARTITION
- MySQL Stored Procedures (dynamic SQL with PREPARE/EXECUTE)
- Bash scripting for automation

## Sources Consulted
- MySQL 8.0 Reference Manual: Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning.html
- MySQL 8.0 Reference Manual: RANGE Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-range.html
- MySQL 8.0 Reference Manual: Partition Management (REORGANIZE PARTITION) — https://dev.mysql.com/doc/refman/8.0/en/partitioning-management-range-list.html
- MySQL 8.0 Reference Manual: Exchanging Partitions and Subpartitions with Tables — https://dev.mysql.com/doc/refman/8.0/en/partitioning-management-exchange.html
- MySQL 8.0 Reference Manual: CREATE TABLE ... LIKE — https://dev.mysql.com/doc/refman/8.0/en/create-table-like.html
- MySQL 8.0 Reference Manual: Partition Selection — https://dev.mysql.com/doc/refman/8.0/en/partitioning-selection.html
- MySQL 8.0 Reference Manual: Partition Pruning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-pruning.html

## Issues Found

### Issue 1 (Critical): EXCHANGE PARTITION requires a non-partitioned target table
- **What was wrong:** The archiving examples used `CREATE TABLE events_archive LIKE events;` to create the archive table. `CREATE TABLE ... LIKE` copies the full table definition including partition definitions. However, `ALTER TABLE ... EXCHANGE PARTITION ... WITH TABLE` requires the target table to be non-partitioned. The EXCHANGE PARTITION statement would fail with an error.
- **What was changed:** Added `ALTER TABLE events_archive REMOVE PARTITIONING;` after the `CREATE TABLE ... LIKE` statement in both the SQL example (Archiving Old Partitions section) and the bash script (Scheduling the Archival Process section).
- **Why:** Per MySQL documentation, EXCHANGE PARTITION swaps a partition with a non-partitioned table that has an identical structure (minus partitioning). Without removing partitioning, MySQL raises an error.

### Issue 2 (Minor): Incorrect terminology — "partition pruning" vs "partition selection"
- **What was wrong:** The comment on `SELECT COUNT(*) FROM events PARTITION (p_2026_01);` said "requires partition pruning." This is explicit partition selection (using the `PARTITION` clause to directly specify which partition to read), not partition pruning. Partition pruning is an optimizer feature where MySQL automatically eliminates irrelevant partitions based on WHERE clause conditions.
- **What was changed:** Changed the comment from "requires partition pruning" to "explicit partition selection."
- **Why:** The two concepts are distinct in MySQL documentation. Using the wrong term could confuse readers trying to learn about partitioning.

## Review Notes
- The `table_rows` value from `information_schema.PARTITIONS` is an estimate for InnoDB tables, not an exact count. The post uses it in a metadata-viewing context which is appropriate, but readers should be aware of this if they need exact counts.
- The stored procedure concatenates the `table_name` parameter directly into the SQL string without sanitization. This is acceptable for an internal administrative procedure but should not be exposed to untrusted input.
- The `CREATE TABLE IF NOT EXISTS` in the bash script could silently skip the `REMOVE PARTITIONING` step if the table already exists from a prior failed run. In production, additional error handling and idempotency checks would be advisable.
