# Validation Summary: How to View User Privileges with SHOW GRANTS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7 and 8.0+)
- MySQL SHOW GRANTS statement
- MySQL information_schema privilege tables
- MySQL role-based access control (8.0+)
- Bash scripting for MySQL administration

## Sources Consulted
- MySQL 8.0 Reference Manual — SHOW GRANTS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.4 Reference Manual — The INFORMATION_SCHEMA USER_PRIVILEGES Table: https://dev.mysql.com/doc/refman/8.4/en/information-schema-user-privileges-table.html
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA USER_PRIVILEGES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-user-privileges-table.html
- MySQL 9.6 Reference Manual — Privileges Provided by MySQL: https://dev.mysql.com/doc/refman/9.6/en/privileges-provided.html

## Issues Found
1. **Incorrect query in "Checking for Overly Broad Grants" section.** The original query filtered `information_schema.USER_PRIVILEGES` with `WHERE PRIVILEGE_TYPE = 'ALL PRIVILEGES'`. This would always return empty results because MySQL stores each privilege as a separate row (SELECT, INSERT, UPDATE, etc.) — the string `'ALL PRIVILEGES'` never appears as a `PRIVILEGE_TYPE` value. Replaced with a `GROUP BY / HAVING` query that identifies users whose privilege count equals the total number of distinct global privilege types, which correctly detects users with ALL PRIVILEGES.

## Review Notes
- The shell loop in "Listing All User Accounts and Their Grants" uses `mysql -u root -p` inside the loop body, which will prompt for a password on each iteration. In practice, users would rely on a `~/.my.cnf` file or `mysql_config_editor` to avoid repeated prompts. This is a usability concern rather than a technical error.
- The `SHOW GRANTS FOR $account` in the shell script works for simple usernames but could break for usernames containing special characters or spaces. For robustness, the CONCAT in the SQL query should wrap user and host in quotes (which the SQL-based approach in Step 1 already does correctly).
- The summary statement "In MySQL 8.0, always include `USING role` to see effective privileges contributed by roles" is slightly strong — `USING` is only needed when you specifically want to see role-inherited privileges expanded. Technically not incorrect, but could be misread as a requirement for every `SHOW GRANTS` call.
