# Validation Summary: How to Use UNION in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL UNION and UNION ALL set operations
- SELECT statements, ORDER BY, WHERE, GROUP BY, subqueries

## Sources Consulted
- MySQL 8.0 Reference Manual: UNION Clause — https://dev.mysql.com/doc/refman/8.0/en/union.html
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: GROUP BY Functional Dependence — https://dev.mysql.com/doc/refman/8.0/en/group-by-functional-dependence.html

## Issues Found
No technical issues found.

## Review Notes
- The "Building a Unified Contact List" example appends a different literal type string ('Employee', 'Customer', 'Vendor') to each SELECT. Because UNION deduplicates on the full row, the same email appearing in multiple source tables will still appear multiple times in the result (once per type). The comment says "deduplicated," which is true for identical rows but may be slightly misleading if the reader expects cross-source email deduplication. This is not a technical error — UNION behaves exactly as documented — but readers should be aware of this nuance.
- The subquery example uses `GROUP BY customers.id` while selecting the non-aggregated column `name`. This is valid because `customers.id` is the PRIMARY KEY, so `name` is functionally dependent on it, satisfying ONLY_FULL_GROUP_BY mode (MySQL 5.7.5+). Worth noting for readers on older MySQL versions.
- All SQL syntax is correct and follows current MySQL conventions. No deprecated features are used.
