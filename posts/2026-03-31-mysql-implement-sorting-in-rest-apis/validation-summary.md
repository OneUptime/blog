# Validation Summary: How to Implement Sorting in REST APIs with MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ for DESC index support)
- Node.js (Express.js router pattern)
- mysql2 Node.js driver (pool.query with prepared statements)
- SQL prepared statements / parameterized queries
- REST API design patterns

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE INDEX Statement (DESC index support): https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — Prepared Statements: https://dev.mysql.com/doc/refman/8.0/en/sql-prepared-statements.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- mysql2 npm package documentation (pool.query API): https://github.com/sidorares/node-mysql2
- OWASP SQL Injection Prevention Cheat Sheet (allowlist approach for identifiers): https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html

## Issues Found
No technical issues found.

## Review Notes
- DESC indexes (used in the composite index examples) require MySQL 8.0+. In MySQL 5.7 and earlier, the DESC keyword in index definitions was parsed but silently ignored. The post does not mention this version caveat, which is reasonable since MySQL 8.0 has been GA since April 2018.
- The first code example always appends `id DESC` as a tiebreaker even if the user sorts by `id`. This results in a redundant `ORDER BY id ASC, id DESC` clause which is harmless (MySQL uses the first occurrence) but slightly inelegant. The multi-column example handles this correctly by checking for existing `id` clauses. This is a minor code design choice, not a technical error.
- The JSON metadata example uses `[...]` as a placeholder for the data array, which is not valid JSON but is a standard documentation convention.
