# Validation Summary: How to Avoid Filesort in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0+)
- MySQL EXPLAIN output interpretation
- MySQL indexing (composite indexes, descending indexes, covering indexes)
- MySQL server status variables (Sort_scan, Sort_range, Sort_merge_passes)

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: ORDER BY Optimization — https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html
- MySQL 8.0 Reference Manual: Descending Indexes — https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- MySQL 8.0 Reference Manual: Index Condition Pushdown Optimization — https://dev.mysql.com/doc/refman/8.0/en/index-condition-pushdown-optimization.html
- MySQL 8.0 Reference Manual: Server Status Variables (Sort_merge_passes) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html

## Issues Found

### 1. Pattern 1: Incorrect "Using index" in EXPLAIN comment (line 36)
- **What was wrong:** The comment `-- Extra: Using index (filesort eliminated)` claimed the EXPLAIN output would show `Using index`. In MySQL, `Using index` in the Extra column specifically means a *covering index* (index-only scan) where all needed columns are in the index. The query `SELECT title FROM articles ORDER BY published_at DESC` selects `title`, which is not in the `idx_published(published_at DESC)` index, so table lookups are still required. The filesort is correctly eliminated, but the EXPLAIN Extra column would not show `Using index`.
- **What was changed:** Updated comment to `-- Extra: no "Using filesort" (filesort eliminated)` to accurately reflect that the key indicator is the absence of "Using filesort" rather than the presence of "Using index".

### 2. Pattern 4: Incorrect "Using index" in EXPLAIN comment (line 88)
- **What was wrong:** The comment `-- Extra: Using index (filesort eliminated in MySQL 8.0+)` had the same issue. The query uses `SELECT *`, which retrieves all columns from the `orders` table. A two-column index `(customer_id ASC, created_at DESC)` cannot be a covering index for `SELECT *` (unless the table has only those two columns). The filesort elimination claim is correct for MySQL 8.0+, but `Using index` would not appear in EXPLAIN.
- **What was changed:** Updated comment to `-- Extra: no "Using filesort" (filesort eliminated in MySQL 8.0+)` for accuracy.

## Review Notes
- The distinction between "Using index" (covering index) and "using an index for ordering" is a common source of confusion in MySQL optimization. Pattern 5 correctly identifies `Using index` for a true covering index, which makes the incorrect usage in Patterns 1 and 4 more important to fix for consistency.
- Patterns 2 and 3 use `Using index condition` (Index Condition Pushdown) in their EXPLAIN comments. While ICP may or may not appear depending on the MySQL version, optimizer decisions, and table statistics, these are plausible outputs and the educational point (filesort present vs. absent) is accurately conveyed.
- The `Sort_merge_passes` monitoring advice is correct but simplified. In MySQL 8.0+, increasing `sort_buffer_size` beyond ~256KB-1MB can sometimes hurt performance due to changes in memory allocation strategy (switching from incremental to full allocation). This is a nuance the post could mention in a future update but is not an error.
- Pattern 1 uses `CREATE INDEX ... (published_at DESC)` without explicitly noting this requires MySQL 8.0 for the DESC to be honored. In MySQL 5.7, DESC is parsed but ignored. However, a backward index scan on an ASC index still eliminates filesort for DESC ordering in 5.7, so the advice works correctly across versions.
