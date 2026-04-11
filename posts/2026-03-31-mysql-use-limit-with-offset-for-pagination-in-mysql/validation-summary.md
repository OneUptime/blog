# Validation Summary: How to Use LIMIT with OFFSET for Pagination in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (LIMIT, OFFSET, ORDER BY, EXPLAIN, DELETE with LIMIT)
- Python (MySQL Connector / PyMySQL parameterized queries)
- SQL pagination patterns (offset-based and keyset/cursor-based)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement, LIMIT clause: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — DELETE Statement (LIMIT support): https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual — UPDATE Statement (LIMIT support): https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual — EXPLAIN Statement: https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL Connector/Python documentation (parameterized queries with %s placeholders)

## Issues Found
No technical issues found.

## Review Notes
- The f-string SQL example could be flagged as a SQL injection risk, but the post immediately follows it with a parameterized query alternative, which adequately addresses the concern.
- The comment "This scans 100,000 rows to return 10" is slightly imprecise — MySQL actually examines 100,010 rows (100,000 skipped + 10 returned) — but the simplification is reasonable and conveys the correct concept.
- The section "LIMIT in DELETE and UPDATE" mentions both statements but only provides a DELETE example. This is acceptable but a future update could add an UPDATE example for completeness.
