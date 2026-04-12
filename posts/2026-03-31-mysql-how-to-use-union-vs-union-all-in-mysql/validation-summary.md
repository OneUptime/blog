# Validation Summary: How to Use UNION vs UNION ALL in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (UNION, UNION ALL, set operations)
- SQL (SELECT, recursive CTEs, EXPLAIN)

## Sources Consulted
- MySQL 8.0 Reference Manual: UNION Clause — https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual: Recursive Common Table Expressions — https://dev.mysql.com/doc/refman/8.0/en/with.html#common-table-expressions-recursive
- MySQL 8.0.19 Release Notes (added UNION DISTINCT support in recursive CTEs) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-19.html

## Issues Found
1. **Recursive CTE claim was incorrect for modern MySQL.** The comment "Recursive CTEs require UNION ALL" and the comparison table row "Use in recursive CTE | No | Yes (required)" stated that UNION (DISTINCT) cannot be used in recursive CTEs. This was true before MySQL 8.0.19 (released January 2020), but since that version, both UNION ALL and UNION DISTINCT are supported in recursive CTEs. Updated the comment to note this and changed the table row to "Yes (since 8.0.19) | Yes".

2. **"Sorts result | Implicitly | No" was misleading.** UNION does not guarantee sorted output. While older MySQL versions used filesort for deduplication (which could produce apparently sorted results), this was never guaranteed behavior. MySQL 8.0+ may use hash-based deduplication instead. Changed row to "Guaranteed order | No (use ORDER BY) | No (use ORDER BY)" to avoid the common misconception that UNION implies sorted results.

## Review Notes
- The EXPLAIN example mentions looking for "Using temporary; Using filesort" in the Extra column. In MySQL 8.0.16+, the optimizer may use hash-based aggregation for deduplication instead of sorting, so "Using filesort" may not always appear. The note is still reasonable as a general guideline but is not universally true on newer versions.
- All SQL syntax in the post is correct and the examples demonstrate valid, practical use cases.
- The decision flowchart and overall guidance (default to UNION ALL, use UNION only when dedup is needed) is sound advice.
