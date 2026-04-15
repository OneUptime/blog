# Validation Summary: How to Use RENAME TABLE in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL, DDL)
- RENAME TABLE statement
- EXCHANGE TABLES statement
- ON CLUSTER distributed operations

## Sources Consulted
- ClickHouse official documentation — RENAME statement: https://clickhouse.com/docs/en/sql-reference/statements/rename
- ClickHouse official documentation — EXCHANGE statement: https://clickhouse.com/docs/en/sql-reference/statements/exchange
- ClickHouse official documentation — CREATE TABLE: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse official documentation — EXISTS: https://clickhouse.com/docs/en/sql-reference/statements/exists

## Issues Found

### Issue 1: Multi-table RENAME falsely claimed to be atomic (Critical)
- **What was wrong:** The post stated "All renames are applied atomically" for comma-separated renames in a single RENAME TABLE statement, and the Summary section repeated this claim. The official ClickHouse documentation explicitly states: "If you rename multiple tables in one query, the operation is not atomic. It may be partially executed."
- **What was changed:** Corrected the "Renaming Multiple Tables" section to clarify that multi-table renames are not atomic and that other sessions may see intermediate states. Updated the Summary section accordingly.

### Issue 2: Atomic Swap Pattern used non-atomic RENAME instead of EXCHANGE TABLES (Critical)
- **What was wrong:** The "Atomic Swap Pattern" section used a multi-table RENAME TABLE as the swap mechanism and implied it was atomic, then mentioned EXCHANGE TABLES only as a footnote. Since the multi-table RENAME is not atomic, this pattern has a window where queries could fail to find the production table.
- **What was changed:** Rewrote the section to use EXCHANGE TABLES as the primary swap mechanism (which is truly atomic). Added the multi-table RENAME as a fallback for non-Atomic database engines with a clear warning that it is not atomic. Added a note that EXCHANGE TABLES requires the Atomic database engine (default since ClickHouse 20.5).

## Review Notes
- The blog's claim that RENAME TABLE is a "metadata operation" is a reasonable characterization. The official docs do not use this exact phrase, but the same-filesystem requirement for cross-database renames implies a filesystem-level rename (which does not copy data).
- The `CREATE TABLE ... AS ...` syntax for copying schema is correct per the docs.
- The `EXISTS TABLE` returning 0 or 1 is correct — it returns a single UInt8 column.
- The ON CLUSTER syntax is correctly documented.
- For cross-database renames, the claim "No data files are relocated" is correct at the data level — a filesystem rename changes directory entries without copying data, though the file paths do change.
