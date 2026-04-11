# Validation Summary: How to Configure MySQL Password Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0+ (validate_password component, password expiration, reuse policies, account locking)
- MySQL 5.7 (validate_password plugin)
- caching_sha2_password and mysql_native_password authentication plugins

## Sources Consulted
- MySQL 8.0 Reference Manual: The Password Validation Component — https://dev.mysql.com/doc/refman/8.0/en/validate-password.html
- MySQL 8.0 Reference Manual: Password Management — https://dev.mysql.com/doc/refman/8.0/en/password-management.html
- MySQL 8.0 Reference Manual: Account Locking — https://dev.mysql.com/doc/refman/8.0/en/account-locking.html
- MySQL 8.0 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: Using Option Files — https://dev.mysql.com/doc/refman/8.0/en/option-files.html
- MySQL 8.0 Reference Manual: Caching SHA-2 Pluggable Authentication — https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html

## Issues Found
1. **Incorrect comment syntax in `.cnf` configuration snippet (Password Reuse Policy section):** The inline comments in the `[mysqld]` config block used `--` (SQL comment syntax), which is not valid in MySQL option files. MySQL `.cnf` files use `#` or `;` for comments. Using `--` would cause the value to be parsed incorrectly or trigger a configuration error. Changed `--` to `#` on both lines.

## Review Notes
- The `FAILED_LOGIN_ATTEMPTS` and `PASSWORD_LOCK_TIME` clauses were introduced in MySQL 8.0.19, not available in all MySQL 8.0 minor versions. The post says "MySQL 8.0" which is acceptable but readers on earlier 8.0.x releases should be aware.
- Password reuse policy (`PASSWORD HISTORY`, `PASSWORD REUSE INTERVAL`) was introduced in MySQL 8.0.13.
- The `default_authentication_plugin` system variable was deprecated in MySQL 8.0.27 in favor of `authentication_policy`. The post's usage is still correct for MySQL 8.0 but readers on MySQL 8.4+ should use the newer variable name.
- In MySQL 8.4, `mysql_native_password` is disabled by default (not just deprecated). The post's advice to use it for legacy compatibility is appropriate for MySQL 8.0 but may need updating for 8.4+.
- All SQL syntax, system variable names (dot notation for 8.0 component), INSTALL COMPONENT syntax, and VALIDATE_PASSWORD_STRENGTH() function usage are correct.
