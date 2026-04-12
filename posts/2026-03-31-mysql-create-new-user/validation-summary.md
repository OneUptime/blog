# Validation Summary: How to Create a New User in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL (CREATE USER, GRANT, SHOW GRANTS)
- MySQL authentication plugins (caching_sha2_password, mysql_native_password)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: Privilege Changes — https://dev.mysql.com/doc/refman/8.0/en/privilege-changes.html
- MySQL 8.0 Reference Manual: Password Management — https://dev.mysql.com/doc/refman/8.0/en/password-management.html
- MySQL 5.7 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/5.7/en/create-user.html

## Issues Found

1. **Unnecessary FLUSH PRIVILEGES after GRANT**: The post included `FLUSH PRIVILEGES;` with the comment "Apply the privilege changes" after `GRANT` statements. This is unnecessary and misleading. When using account management statements like `GRANT`, `REVOKE`, `SET PASSWORD`, or `RENAME USER`, the server automatically reloads the grant tables into memory. `FLUSH PRIVILEGES` is only required when modifying grant tables directly via `INSERT`, `UPDATE`, or `DELETE` on `mysql.*` system tables. Removed the `FLUSH PRIVILEGES` line and its comment.

2. **Incorrect version annotation for multi-user CREATE USER**: The section "Creating Multiple Users in One Statement" was labeled "(MySQL 8.0+)", implying this feature was introduced in MySQL 8.0. In fact, the `CREATE USER` statement has supported multiple user specifications in a single statement since at least MySQL 5.6. Removed the incorrect "(MySQL 8.0+)" label.

## Review Notes
- The `mysql_native_password` plugin was deprecated in MySQL 8.0.34 and is disabled by default in MySQL 8.4. The post's example using it for "compatibility with older clients" is valid advice for MySQL 8.0.x, but readers on MySQL 8.4+ should be aware it may require explicit enablement via the `mysql-native-password` server option.
- All SQL syntax examples are correct and would execute successfully on MySQL 8.0.
- The password expiration syntax (PASSWORD EXPIRE and PASSWORD EXPIRE INTERVAL) is accurate.
- The explanation of user-host pair authentication model is correct.
