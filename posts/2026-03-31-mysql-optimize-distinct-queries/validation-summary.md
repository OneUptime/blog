# Validation Summary: How to Optimize DISTINCT Queries in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DISTINCT queries, query optimization)
- SQL (SELECT DISTINCT, GROUP BY, EXISTS, CREATE INDEX)
- EXPLAIN execution plan analysis

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT DISTINCT Optimization — https://dev.mysql.com/doc/refman/8.0/en/distinct-optimization.html
- MySQL 8.0 Reference Manual: GROUP BY Optimization — https://dev.mysql.com/doc/refman/8.0/en/group-by-optimization.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: Optimizing Subqueries with EXISTS Strategy — https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization-with-exists.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html

## Issues Found
No technical issues found.

## Review Notes
- In MySQL 8.0.13+, the optimizer internally transforms DISTINCT into GROUP BY in many cases, making Optimization 2 (rewriting DISTINCT as GROUP BY) effectively neutral rather than a clear win. The blog's phrasing ("can use indexes more efficiently in some cases") is appropriately hedged and not incorrect, but readers on modern MySQL may see no difference.
- The post does not specify a target MySQL version. All advice is valid across MySQL 5.7 and 8.0+.
- The EXPLAIN warning sign `type: ALL` uses colon notation rather than showing the actual EXPLAIN table column format, but this is clear enough for a blog audience.
