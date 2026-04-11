# Validation Summary: How to Configure MySQL Replication Filters

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL replication (replica-side and source-side filters)
- MySQL configuration (my.cnf / mysqld.cnf)
- `CHANGE REPLICATION FILTER` SQL statement
- MySQL Performance Schema (`replication_applier_filters` table)
- Multi-source replication with per-channel filters
- Mermaid flowchart (filter evaluation order diagram)

## Sources Consulted
- MySQL 8.0 Reference Manual — Replication and Binary Logging Options: https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html
- MySQL 8.0 Reference Manual — CHANGE REPLICATION FILTER Statement: https://dev.mysql.com/doc/refman/8.0/en/change-replication-filter.html
- MySQL 8.0 Reference Manual — Evaluation of Table-Level Replication Options: https://dev.mysql.com/doc/refman/8.0/en/replication-rules-table-options.html
- MySQL 8.0 Reference Manual — Evaluation of Database-Level Replication Options: https://dev.mysql.com/doc/refman/8.0/en/replication-rules-db-options.html
- MySQL 8.0 Reference Manual — STOP REPLICA Statement: https://dev.mysql.com/doc/refman/8.0/en/stop-replica.html
- MySQL 8.0 Reference Manual — Performance Schema Replication Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-filters-table.html

## Issues Found

1. **Incorrect quoting description in CHANGE REPLICATION FILTER example (line 82):**
   The comment said "use backtick-quoted strings" but the code correctly uses single-quoted strings for wildcard filter values. Changed comment to "use single-quoted strings" to match the code and MySQL documentation.

2. **Inaccurate version reference (line 65):**
   The section heading said "MySQL 5.7+" but all examples use the modern `STOP REPLICA` / `START REPLICA` / `SHOW REPLICA STATUS` syntax, which was introduced in MySQL 8.0.22. The `CHANGE REPLICATION FILTER` statement itself was added in MySQL 5.7, but the surrounding commands require 8.0.22+. Changed heading to "MySQL 8.0.22+" and added a note explaining that `CHANGE REPLICATION FILTER` dates back to 5.7 but the `STOP SLAVE` / `START SLAVE` syntax should be used for versions prior to 8.0.22.

3. **Incorrect filter evaluation order flowchart (lines 170-190):**
   The original flowchart had two errors per MySQL's documented evaluation algorithm:
   - `replicate_do_table` and `replicate_wild_do_table` were evaluated as separate sequential steps. If `replicate_do_table` was set but didn't match, the flowchart skipped directly to SKIP instead of also checking `replicate_wild_do_table`. Per MySQL docs, these are evaluated together as a group — a match on either one causes the event to be applied.
   - `replicate_ignore_table` was checked before `replicate_wild_do_table`, but MySQL evaluates all do-rules (both exact and wildcard) before any ignore-rules. This incorrect ordering would produce wrong results when both `replicate_wild_do_table` and `replicate_ignore_table` are set and both match the same table (do-rules should win).

   Rewrote the flowchart to correctly group do-table/wild-do-table together and ignore-table/wild-ignore-table together, matching MySQL's actual evaluation order: do-rules first, then ignore-rules, with unmatched do-rules resulting in skip.

## Review Notes
- The post consistently uses the modern `REPLICA` syntax (8.0.22+) throughout, which is the recommended approach for current MySQL versions. The `SLAVE` equivalents are deprecated but still functional in 8.0.x.
- The `performance_schema.replication_applier_filters` table referenced in the verification section was added in MySQL 8.0.2, which is consistent with the 8.0.22+ minimum version implied by the rest of the post.
- The cross-database query caveat correctly distinguishes between statement-based and row-based replication behavior, though the example is implicitly about statement-based replication. The separate subsection on row-based replication clarifies the difference.
- The `binlog_format` system variable is deprecated as of MySQL 8.0.34 in favor of the default row-based format. The post's recommendation to use row-based replication with table-level filters aligns with MySQL's direction.
