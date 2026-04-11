# Validation Summary: What Is the mysql_secure_installation Script

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0
- mysql_secure_installation utility
- MySQL password validation component (validate_password)
- MySQL user and privilege management

## Sources Consulted
- MySQL 8.0 Reference Manual: mysql_secure_installation — https://dev.mysql.com/doc/refman/8.0/en/mysql-secure-installation.html
- MySQL 8.0 Reference Manual: Password Validation Component — https://dev.mysql.com/doc/refman/8.0/en/validate-password.html
- MySQL 8.0 Reference Manual: REVOKE Statement — https://dev.mysql.com/doc/refman/8.0/en/revoke.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html

## Issues Found
1. **Incorrect REVOKE SUPER example (line 159)**: The post created `appuser` with only `SELECT, INSERT, UPDATE, DELETE ON myapp.*`, then attempted `REVOKE SUPER ON *.* FROM 'appuser'@'localhost';`. This would fail with `Error 1141: There is no such grant defined for user` because `SUPER` was never granted to this user. Replaced with `SHOW GRANTS FOR 'appuser'@'localhost';` to verify the user has only the intended privileges, which is a more useful post-hardening step.

## Review Notes
- The `--use-default` flag shown in the non-interactive mode section is valid (added in MySQL 5.7.2). The `--password` option in that example is for authentication (providing the current root password), not for setting a new password. The blog's framing is slightly ambiguous but not incorrect.
- The heredoc approach for automating `mysql_secure_installation` may not work reliably on MySQL 8.0+, where the tool is a compiled C++ binary that may read directly from `/dev/tty` rather than stdin. This technique was more reliable with the older Perl-based script in MySQL 5.6 and earlier.
- The `validate_password.*` variable names (dot notation) are correct for MySQL 8.0's component-based password validation. In MySQL 5.7, these were `validate_password_*` (underscore notation). The post correctly uses the current MySQL 8.0 syntax.
- The `SUPER` privilege is deprecated as of MySQL 8.0.30 in favor of more granular dynamic privileges, but this is tangential to the fixed example.
