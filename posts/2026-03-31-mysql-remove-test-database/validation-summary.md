# Validation Summary: How to Remove the Test Database in MySQL

## Status
validated

## Post Type
Tutorial / Security Hardening Guide

## Technologies Covered
- MySQL (5.6, 5.7, 8.0+)
- mysql_secure_installation utility
- Bash scripting for automated provisioning

## Sources Consulted
- MySQL 8.0 Reference Manual — String Literals: https://dev.mysql.com/doc/refman/8.0/en/string-literals.html
- MySQL 5.7 Reference Manual — String Literals: https://dev.mysql.com/doc/refman/5.7/en/string-literals.html
- MySQL 8.0 Reference Manual — mysql_secure_installation: https://dev.mysql.com/doc/refman/8.0/en/mysql-secure-installation.html
- MySQL 8.0 Reference Manual — Data Directory Initialization: https://dev.mysql.com/doc/refman/8.0/en/data-directory-initialization.html
- MySQL source code — mysql_system_tables_data.sql (initialization script for mysql.db entries)
- MySQL source code — mysql_secure_installation.cc and mysql_secure_installation.sh

## Issues Found
1. **Missing `DELETE FROM mysql.db` cleanup in manual approach**: The "Removing Test Database Access" section only advised using `DROP DATABASE` and `REVOKE` for custom grants, but did not include the essential step of removing the default grant entries from `mysql.db` that allow any user to access databases matching `test` or `test\_%`. Without this step, the permissions remain in place even after the database is dropped, and any future database matching these patterns would inherit open access. Fixed by adding the `DELETE FROM mysql.db WHERE Db='test' OR Db='test\_%'; FLUSH PRIVILEGES;` command, which is the same approach used internally by `mysql_secure_installation`.

2. **Missing `DELETE FROM mysql.db` cleanup in automation script**: The bash provisioning script dropped the database and removed anonymous/remote-root users, but did not remove the test database grant entries from `mysql.db`. The `DROP USER` commands for `''@'localhost'` and `''@'::1'` do not affect these entries because the grants use `Host='%'` and `User=''` (matching any user, not a specific anonymous account). Fixed by adding the same DELETE + FLUSH PRIVILEGES commands to the script.

## Review Notes
- MySQL 8.0+ no longer creates the `test` database or its associated `mysql.db` grant entries during initialization. The post's guidance is most relevant to MySQL 5.6/5.7 installations and MariaDB, which still follow the older initialization behavior. A version note could be added in the future.
- The `\_` escape sequence in MySQL string literals is a recognized escape that preserves the backslash in non-LIKE contexts (per MySQL docs Table 9.1). The post's checking query `WHERE db = 'test\_%'` correctly matches the stored value `test\_%` in `mysql.db`.
- The automation script's `DROP USER IF EXISTS` syntax requires MySQL 5.7+. On MySQL 5.6 or earlier, these statements would produce errors if the users don't exist. This is a minor version compatibility note, not a bug, since MySQL 5.6 is EOL.
- The script passes the root password on the command line (`-p"${MYSQL_ROOT_PASS}"`), which exposes it in process listings. In production, using `mysql_config_editor` or a defaults file (`--defaults-extra-file`) would be more secure. This is a best-practice consideration rather than a correctness issue.
