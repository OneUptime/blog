# Validation Summary: What Is the COPY Algorithm for ALTER TABLE in MySQL

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- MySQL (InnoDB, ALTER TABLE, Online DDL)
- COPY, INPLACE, and INSTANT algorithms for DDL
- pt-online-schema-change, gh-ost (mentioned as alternatives)

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE and Online DDL (https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)
- MySQL 8.0 Reference Manual: Online DDL Operations (https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)
- MySQL 8.0 Reference Manual: Online DDL Performance and Concurrency (https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-performance.html)

## Issues Found

1. **Incorrect step in COPY algorithm workflow (Step 3)**: The original post listed "Apply any DML changes that occurred during the copy (via a log of changes)" as step 3 of the COPY algorithm. This is wrong — maintaining and replaying a concurrent DML log is a feature of the INPLACE algorithm, not COPY. The COPY algorithm blocks writes for the entire duration, so there are no concurrent DML changes to apply. The post even contradicted itself in the following paragraph by stating writes are blocked for the full duration. Removed the incorrect step and renumbered. Replaced the follow-up paragraph with an accurate explanation contrasting COPY and INPLACE behavior.

2. **Broken sentence in "Checking Which Algorithm" section**: The sentence "Use `EXPLAIN` is not available for DDL" was grammatically broken. Fixed to "`EXPLAIN` is not available for DDL statements."

## Review Notes
- The monitoring query using `information_schema.INNODB_TRX` is a reasonable approach but may not reliably show ALTER TABLE progress for all COPY operations. For MySQL 8.0+, enabling Performance Schema stage instruments (`events_stages_current`) provides more reliable progress tracking for ALTER TABLE. The post mentions Performance Schema as an alternative, which is adequate.
- The comparison table is accurate but simplified. INPLACE does not always allow concurrent writes — it depends on the specific operation. The "(for supported ops)" qualifier is sufficient for a high-level overview.
- The `ADD COLUMN ... DEFAULT` example in the "Checking Which Algorithm" section would use INSTANT by default in MySQL 8.0.12+, making it a good illustration of the try-INSTANT-first approach.
