# Validation Summary: How to Create a Read-Only User in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE USER, GRANT, REVOKE, DROP USER, SHOW GRANTS)
- Bash scripting for automation

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE USER Statement (https://dev.mysql.com/doc/refman/8.0/en/create-user.html)
- MySQL 8.0 Reference Manual: GRANT Statement (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- MySQL 8.0 Reference Manual: SHOW VIEW Privilege (https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html#priv_show-view)
- MySQL 8.0 Reference Manual: REVOKE Statement (https://dev.mysql.com/doc/refman/8.0/en/revoke.html)
- MySQL 8.0 Reference Manual: SHOW GRANTS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-grants.html)

## Issues Found
- **Step 3 - SHOW VIEW explanation was misleading**: The post stated "If the read-only user needs to query views, also grant `SHOW VIEW`." This is incorrect — a user with `SELECT` privilege can already query views. The `SHOW VIEW` privilege is specifically needed to inspect view definitions via `SHOW CREATE VIEW`. Fixed the explanation to clarify this distinction and added a note that SELECT alone is sufficient for querying views.

## Review Notes
- All SQL syntax (CREATE USER, GRANT, REVOKE, DROP USER, SHOW GRANTS) is correct for MySQL 5.7+ and 8.0+.
- The post correctly omits FLUSH PRIVILEGES, since GRANT/CREATE USER statements automatically reload the grant tables.
- The shell script references `${MYSQL_ROOT_PASS}` as an environment variable without defining it in the script, which is a reasonable pattern for avoiding hardcoded root passwords.
- The expected SHOW GRANTS output correctly shows the implicit USAGE grant alongside the explicit SELECT grant.
- Error codes (1142, SQLSTATE 42000) are accurate for privilege-denied errors in MySQL.
