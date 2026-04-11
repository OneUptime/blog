# Validation Summary: MySQL UNION vs UNION ALL: Differences and Performance

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL
- SQL (UNION, UNION ALL operators)
- EXPLAIN query plans

## Sources Consulted
- MySQL 8.0 Reference Manual: UNION Clause — https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: Optimizing UNION Statements — https://dev.mysql.com/doc/refman/8.0/en/union-optimization.html

## Issues Found
No technical issues found.

## Review Notes
- The post correctly warns that using UNION with aggregate functions (e.g., SUM over a subquery) can silently produce wrong results by deduplicating rows with identical values — this is an important and often-overlooked pitfall.
- The phrasing "apply ORDER BY to the last SELECT" in the ORDER BY section could in theory be misread as applying only to the last SELECT rather than the entire UNION result, but the surrounding context ("To sort the final combined result") makes the intent clear, and the example code is correct.
- In MySQL 8.0.19+, parenthesized query expressions can include their own ORDER BY/LIMIT directly without subqueries, which is a newer alternative to the subquery approach shown. This is not an error in the post — the subquery technique works across all MySQL versions.
- The EXPLAIN section notes about UNION RESULT rows and temporary tables are accurate for both MySQL 5.7 and 8.0.
