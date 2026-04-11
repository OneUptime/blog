# Validation Summary: How to Set Up MySQL Root Password and User Accounts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL (DDL/DCL statements: CREATE USER, GRANT, REVOKE, ALTER USER, DROP USER)
- caching_sha2_password authentication plugin
- mysql_native_password authentication plugin
- mysqld_safe
- systemd (systemctl)

## Sources Consulted
- MySQL 8.0 Reference Manual: Account Management Statements — https://dev.mysql.com/doc/refman/8.0/en/account-management-statements.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: ALTER USER Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: Caching SHA-2 Pluggable Authentication — https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html
- MySQL 8.0 Reference Manual: How to Reset the Root Password — https://dev.mysql.com/doc/refman/8.0/en/resetting-permissions.html
- MySQL 8.0 Reference Manual: Privilege Changes — https://dev.mysql.com/doc/refman/8.0/en/privilege-changes.html

## Issues Found
No technical issues found.

## Review Notes
- **FLUSH PRIVILEGES usage**: The post includes `FLUSH PRIVILEGES` after `ALTER USER`, `GRANT`, and `REVOKE` statements throughout. Per the MySQL documentation, `FLUSH PRIVILEGES` is only necessary when modifying grant tables directly via `INSERT`, `UPDATE`, or `DELETE`. Account management statements (`ALTER USER`, `CREATE USER`, `GRANT`, `REVOKE`, `DROP USER`) automatically reload the grant tables. The usage is not harmful (it simply triggers a redundant reload), but readers may come away believing it is required. The one place where `FLUSH PRIVILEGES` is correctly required is in the root password reset section, where it must be issued after starting with `--skip-grant-tables` to re-enable the grant system before `ALTER USER` can be used.
- **mysql_native_password deprecation**: In MySQL 8.4 (released 2024), `mysql_native_password` is deprecated and disabled by default. The post correctly scopes itself to MySQL 8.0, but readers on newer versions should be aware that the legacy plugin section may not apply without additional configuration.
- **Error log path**: The post uses `/var/log/mysql/error.log`, which is the Debian/Ubuntu default. RHEL/CentOS systems typically use `/var/log/mysqld.log`. The post contextualizes this for Debian/Ubuntu, which is appropriate.
