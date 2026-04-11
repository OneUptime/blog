# Validation Summary: How to Use SHOW CREATE USER in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL (SHOW CREATE USER, CREATE USER, SHOW GRANTS, SELECT from mysql.user)
- MySQL user account management (authentication plugins, password policies, resource limits, TLS requirements)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW CREATE USER Statement (https://dev.mysql.com/doc/refman/8.0/en/show-create-user.html)
- MySQL 8.0 Reference Manual: CREATE USER Statement (https://dev.mysql.com/doc/refman/8.0/en/create-user.html)
- MySQL 8.0 Reference Manual: SHOW GRANTS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-grants.html)
- MySQL 8.0 Reference Manual: The mysql.user Grant Table (https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html)
- MySQL 8.0 Reference Manual: GRANT Statement (https://dev.mysql.com/doc/refman/8.0/en/grant.html)

## Issues Found
No technical issues found.

## Review Notes
- All sample output shown matches real MySQL 8.0 behavior, including the vertical output format with `\G`.
- Features like `PASSWORD HISTORY`, `PASSWORD REQUIRE CURRENT`, `FAILED_LOGIN_ATTEMPTS`, and `PASSWORD_LOCK_TIME` are MySQL 8.0+ only. The post does not explicitly state a minimum version, but since MySQL 8.0 is the current GA release and 5.7 has reached end-of-life, this is acceptable.
- The Required Privileges section mentions `CREATE USER` privilege for viewing other accounts. This is correct, though users with `SELECT` on the `mysql` system schema can also view other accounts. The simplification is reasonable for the scope of the post.
- The `SHOW CREATE USER` statement was introduced in MySQL 5.7.6, so it is not available on MySQL 5.6 or earlier.
