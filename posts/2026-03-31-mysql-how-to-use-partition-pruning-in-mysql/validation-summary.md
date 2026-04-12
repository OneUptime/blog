# Validation Summary: How to Use Partition Pruning in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- MySQL Partitioning (RANGE, LIST, KEY subpartitioning)
- MySQL EXPLAIN for query analysis
- information_schema.PARTITIONS

## Sources Consulted
- MySQL 8.0 Reference Manual — Partition Pruning: https://dev.mysql.com/doc/refman/8.0/en/partitioning-pruning.html
- MySQL 8.0 Reference Manual — RANGE Partitioning: https://dev.mysql.com/doc/refman/8.0/en/partitioning-range.html
- MySQL 8.0 Reference Manual — Subpartitioning: https://dev.mysql.com/doc/refman/8.0/en/partitioning-subpartitions.html
- MySQL 8.0 Reference Manual — Partition Selection: https://dev.mysql.com/doc/refman/8.0/en/partitioning-selection.html
- MySQL 8.0 Reference Manual — Partition Management: https://dev.mysql.com/doc/refman/8.0/en/partitioning-management.html

## Issues Found
- **Misleading comment about functions breaking pruning**: The SQL comment in the "Queries That Prevent Pruning" section stated "Functions applied to the partition column break pruning." This is inaccurate as a general rule because earlier in the post, `WHERE YEAR(created_at) = 2024` is shown as a query that enables pruning — and `YEAR()` is itself a function applied to the partition column. The key distinction is that the function must differ from the partitioning expression to break pruning. Changed the comment to "Functions that differ from the partitioning expression break pruning" to be technically precise.

## Review Notes
- The post correctly demonstrates MySQL's special optimization for `YEAR()` and `TO_DAYS()` partition expressions, which allows pruning even when the WHERE clause uses range conditions on the underlying DATE/DATETIME column rather than the partition expression directly.
- The EXPLAIN output format shown (with a `partitions` column by default) is accurate for MySQL 8.0+. In MySQL 5.7, `EXPLAIN PARTITIONS` or `EXPLAIN FORMAT=JSON` was needed. The post does not specify a version, which is fine since MySQL 8.0 is the current supported release.
- The claim that "Dropping a partition is instantaneous" is slightly simplified — it's a metadata + file-drop operation rather than truly O(1) — but it is accurate enough for a tutorial context and correctly conveys the key advantage over row-by-row DELETE.
