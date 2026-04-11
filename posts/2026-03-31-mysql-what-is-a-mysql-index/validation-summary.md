# Validation Summary: What Is a MySQL Index

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- B-tree indexes
- EXPLAIN query analysis
- Performance Schema (MySQL 8.0+)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: InnoDB Index Types — https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: Index Condition Pushdown Optimization — https://dev.mysql.com/doc/refman/8.0/en/index-condition-pushdown-optimization.html
- MySQL 8.0 Reference Manual: Multiple-Column Indexes — https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html
- MySQL 8.0 Reference Manual: Performance Schema table_io_waits_summary_by_index_usage — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html

## Issues Found
No technical issues found.

## Review Notes
- The post refers to B-tree as "balanced tree." The "B" in B-tree was never officially defined by its inventor Rudolf Bayer. "Balanced" is one of the most common interpretations and is not incorrect, but it is worth noting. MySQL's own documentation simply refers to these as "B-tree indexes."
- InnoDB technically uses B+tree (leaf nodes contain all values and are linked), but MySQL's official documentation consistently calls them "B-tree indexes," so the post's terminology is aligned with official docs.
- The summary advises "placing the most selective column first" for composite indexes. While this is widely repeated advice and not wrong, the optimal column order depends more on query patterns — specifically, equality columns should generally precede range columns in a composite index. This is a simplification rather than an error.
- MySQL 8.0.13+ supports functional indexes (e.g., `CREATE INDEX idx ON users ((YEAR(created_at)))`) which could address the `YEAR(created_at)` example. The post's advice to rewrite as a range query remains the standard and more portable best practice.
- MySQL 8.0.13+ also introduced Skip Scan optimization, which can sometimes use a composite index even when the leftmost column is not in the WHERE clause. The post's explanation of the leftmost prefix rule remains the correct general rule.
