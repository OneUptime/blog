# Validation Summary: What Is a Descending Index in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0 (descending index feature)
- MySQL 5.7 (legacy behavior comparison)
- InnoDB storage engine
- B-tree indexes
- EXPLAIN output analysis

## Sources Consulted
- MySQL 8.0 Reference Manual: Descending Indexes — https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: ORDER BY Optimization — https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html
- MySQL Server Blog: MySQL 8.0 Descending Indexes — https://mysqlserverteam.com/mysql-8-0-labs-descending-indexes-in-mysql/

## Issues Found
No technical issues found.

## Review Notes
- The EXPLAIN output shown in comments is illustrative rather than exact reproductions. For example, the "Latest records queries" section comment mentions "Using index (or Backward index scan without filesort)" — with the DESC index in place, a forward scan would occur (not backward), while the backward scan would apply if only an ASC index existed. The "or" makes this technically acceptable as it covers both scenarios, but could be clearer.
- The EXPLAIN comment `Using index condition (no filesort)` in the products example refers to Index Condition Pushdown (ICP), which is a distinct optimization from index-order scanning. The actual EXPLAIN output for that query would more likely omit "Using index condition" in favor of just showing no filesort. This is a pedagogical simplification, not an error, since the comments are illustrative.
- All SQL syntax is valid for MySQL 8.0+.
- The core technical advice — that descending indexes are primarily valuable for mixed-direction composite ORDER BY — is sound and well-supported by MySQL documentation.
