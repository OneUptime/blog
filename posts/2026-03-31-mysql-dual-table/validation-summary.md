# Validation Summary: How to Use DUAL Table in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DUAL table, SELECT syntax, system variables, stored procedures, date/time functions)
- SQL (ANSI SQL compatibility, UNION ALL, CASE expressions)
- MariaDB (mentioned in corrected Oracle compatibility section)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement (DUAL): https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — SQL Modes: https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL 5.7 Reference Manual — SQL Modes (ORACLE mode deprecation): https://dev.mysql.com/doc/refman/5.7/en/sql-mode.html
- MySQL 8.0 Reference Manual — Date and Time Functions (SYSDATE, DATEDIFF): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MariaDB Documentation — SQL_MODE=ORACLE: https://mariadb.com/kb/en/sql_modeoracle/
- Wikipedia — DUAL table: https://en.wikipedia.org/wiki/DUAL_table

## Issues Found

### 1. Incorrect claim about `sql_mode=ORACLE` in MySQL 8.0+ Enterprise
- **What was wrong:** The post stated that MySQL 8.0+ Enterprise supports `sql_mode=ORACLE` for Oracle compatibility. This is incorrect. MySQL had an `ORACLE` sql_mode in MySQL 5.7, but it was deprecated in 5.7.22 and removed entirely in MySQL 8.0 (all editions). The comprehensive `sql_mode=ORACLE` that provides Oracle PL/SQL compatibility is a MariaDB 10.3+ feature, not a MySQL feature.
- **What was changed:** Rewrote the "DUAL in Oracle Compatibility Mode" section to accurately describe DUAL's role in Oracle SQL compatibility, removed the false claim about MySQL 8.0+ Enterprise, and added a note clarifying that `sql_mode=ORACLE` is a MariaDB feature.

### 2. Incorrect `SYSDATE` syntax (missing parentheses)
- **What was wrong:** The example used `SELECT SYSDATE FROM DUAL;` which is Oracle SQL syntax. In MySQL, `SYSDATE` is a function that requires parentheses: `SYSDATE()`. Without parentheses, MySQL would not recognize it as a function call.
- **What was changed:** Updated the example to `SELECT SYSDATE() FROM DUAL;` and added a comment noting the difference from Oracle syntax.

## Review Notes
- The claim "In MySQL 5.0+" for when FROM DUAL became optional is not strictly wrong, but MySQL allowed `SELECT` without a `FROM` clause even before version 5.0 (at least MySQL 4.x). The 5.0 documentation is simply a commonly cited reference. This is a minor imprecision, not an error.
- The `DATEDIFF('2025-12-31', '2025-01-01')` example uses the alias `days_in_year`, which could be slightly misleading since the result is 364 (the difference between the two dates), not 365 (the total number of days in 2025). The SQL itself is correct; the alias is just informal.
- All other code examples (CASE, IF, COALESCE, UNION ALL, system variables, stored procedures, DATE_ADD, DAYNAME) are syntactically correct and produce the results described.
