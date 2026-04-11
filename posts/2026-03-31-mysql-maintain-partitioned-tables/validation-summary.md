# Validation Summary: How to Maintain Partitioned Tables in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+ partitioning
- InnoDB storage engine
- INFORMATION_SCHEMA.PARTITIONS
- MySQL Event Scheduler
- Prepared statements (dynamic SQL)

## Sources Consulted
- MySQL 8.0 Reference Manual: Maintenance of Partitions — https://dev.mysql.com/doc/refman/8.0/en/partitioning-maintenance.html
- MySQL 8.0 Reference Manual: ALTER TABLE Partition Operations — https://dev.mysql.com/doc/refman/8.0/en/alter-table-partition-operations.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA PARTITIONS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-partitions-table.html
- MySQL 8.0 Reference Manual: Partitioning Limitations Relating to Storage Engines — https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations-storage-engines.html

## Issues Found

1. **OPTIMIZE PARTITION on InnoDB is broken (significant)**
   - **What was wrong:** The post claimed "For InnoDB tables, `OPTIMIZE PARTITION` rebuilds the partition in-place and reclaims `DATA_FREE` space." In reality, `OPTIMIZE PARTITION` does not work correctly with InnoDB partitioned tables — it rebuilds the **entire table**, not just the specified partition (MySQL Bug #11751825, Bug #42822). The MySQL documentation explicitly recommends using `REBUILD PARTITION` + `ANALYZE PARTITION` instead.
   - **What was changed:** Replaced the misleading claim with an accurate note explaining the InnoDB limitation and recommending `REBUILD PARTITION` + `ANALYZE PARTITION` as the correct approach.
   - **Why:** This is a significant correctness issue — readers following the original advice would unknowingly trigger full table rebuilds instead of partition-level maintenance, defeating the purpose of partition-targeted operations.

2. **Event code comment mismatch (minor)**
   - **What was wrong:** The comment in the MySQL Event code said "Analyze the current and previous month's partitions" but the code only analyzes the current month's partition.
   - **What was changed:** Updated the comment to say "Analyze the current month's partition" to match the actual code behavior.
   - **Why:** Misleading comments can cause confusion when readers try to adapt the code.

## Review Notes
- The `REPAIR PARTITION` section correctly notes it is rarely needed for InnoDB. While the MySQL docs don't explicitly prohibit it for InnoDB (unlike OPTIMIZE), InnoDB's crash recovery does handle most corruption scenarios, making the statement reasonable.
- The `INFORMATION_SCHEMA.PARTITIONS` queries are correct. Worth noting that `TABLE_ROWS` is an estimate for InnoDB, not an exact count — but this is a general InnoDB behavior, not specific to this post's topic.
- The fragmentation percentage formula `DATA_FREE / (DATA_LENGTH + 1) * 100` uses `+ 1` as a division-by-zero guard, which is a reasonable defensive pattern.
- The MySQL Event example uses proper `DELIMITER`, `PREPARE`/`EXECUTE` dynamic SQL, and valid scheduling syntax.
