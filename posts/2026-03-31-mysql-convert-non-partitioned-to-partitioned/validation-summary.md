# Validation Summary: How to Convert a Non-Partitioned Table to a Partitioned Table in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB)
- MySQL Partitioning (RANGE partitioning)
- ALTER TABLE for partition conversion
- INFORMATION_SCHEMA.PARTITIONS
- RENAME TABLE (atomic table swap)
- pt-online-schema-change (Percona Toolkit)

## Sources Consulted
- MySQL 8.0 Reference Manual — Partitioning: https://dev.mysql.com/doc/refman/8.0/en/partitioning.html
- MySQL 8.0 Reference Manual — Partitioning Limitations Relating to Keys: https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations-partitioning-keys-unique-keys.html
- MySQL 8.0 Reference Manual — ALTER TABLE Partition Operations: https://dev.mysql.com/doc/refman/8.0/en/alter-table-partition-operations.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA PARTITIONS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-partitions-table.html
- MySQL 8.0 Reference Manual — RENAME TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/rename-table.html
- Percona Toolkit — pt-online-schema-change documentation: https://docs.percona.com/percona-toolkit/pt-online-schema-change.html

## Issues Found

### 1. Combined ALTER TABLE missing p2025 partition
- **What was wrong:** The combined ALTER TABLE statement (combining Steps 2 and 3) defined only 4 partitions (p2022, p2023, p2024, p_future), while Step 3 defined 5 partitions including p2025. The p2025 partition with `VALUES LESS THAN (2026)` was missing from the combined statement.
- **What was changed:** Added `PARTITION p2025 VALUES LESS THAN (2026)` to the combined ALTER TABLE statement to match Step 3.
- **Why:** The combined statement should be functionally equivalent to running Steps 2 and 3 separately. The missing partition was an oversight that would result in a different partitioning scheme than what Step 3 describes.

### 2. pt-online-schema-change does not support partitioning operations
- **What was wrong:** The post showed a pt-online-schema-change command with `PARTITION BY RANGE(...)` inside the `--alter` clause and presented it as a working solution for minimal-downtime partitioning conversions. However, pt-online-schema-change explicitly does not support adding or modifying partitioning via `--alter`. This is documented in Percona's official documentation as an unsupported operation.
- **What was changed:** Added a note explaining the limitation. Restructured the section to show pt-online-schema-change used only for the primary key modification (which it does support), followed by a standard ALTER TABLE for the partitioning step. Directed readers to the create-copy-rename strategy for fully online partitioning conversions.
- **Why:** The original command would fail or produce unexpected results. Readers following the instructions would encounter errors. The corrected approach uses pt-osc only for what it supports and relies on the manual strategy for the partitioning itself.

## Review Notes
- The "Copy data in batches" comment in the create-copy-rename strategy shows a single `INSERT...SELECT` with a WHERE clause, not true batched inserts. For very large tables (hundreds of millions of rows), readers should chunk the INSERT by date range or primary key range to avoid long-running transactions. The example is correct as-is for illustrative purposes but could benefit from a batching example in a future update.
- The RENAME TABLE atomic swap is correctly documented — MySQL does perform this atomically, making it safe for production use.
- All SQL syntax is valid MySQL 8.0+ syntax. The RANGE partitioning with YEAR() function is a well-supported pattern.
- The INFORMATION_SCHEMA.PARTITIONS query uses correct column names and is a standard way to verify partitioning.
