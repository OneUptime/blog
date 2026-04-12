# Validation Summary: How to Use USER() and CURRENT_USER() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (USER(), CURRENT_USER(), SESSION_USER(), SYSTEM_USER() information functions)
- MySQL triggers, stored procedures, and views
- MySQL audit logging patterns
- MySQL permission and grant checking

## Sources Consulted
- MySQL 8.0 Reference Manual — Information Functions: https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_user
- MySQL 8.0 Reference Manual — CURRENT_USER(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_current-user
- MySQL 8.0 Reference Manual — Reserved Words: https://dev.mysql.com/doc/refman/8.0/en/keywords.html
- MySQL 8.0 Reference Manual — SHOW GRANTS: https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.0 Reference Manual — CREATE TRIGGER: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html

## Issues Found
1. **Reserved word used as unquoted column name in stored procedure**: In the "Using in Stored Procedures" section, the column name `user` was used without backtick quoting in the INSERT statement (`INSERT INTO activity_log (user, action, logged_at)`). Since `USER` is a reserved word in MySQL, this would cause a syntax error. Fixed by adding backticks: `` `user` ``.

## Review Notes
- The explanation of the difference between `USER()` and `CURRENT_USER()` is accurate and clear.
- `SESSION_USER()` and `SYSTEM_USER()` are correctly identified as synonyms for `USER()`. Note that starting with MySQL 8.0.16, `SYSTEM_USER` was also introduced as a dynamic privilege, but the function `SYSTEM_USER()` still works as a synonym for `USER()` — the blog post's claim remains correct.
- The permission check query using `CONCAT(user, '@', host) = CURRENT_USER()` is functional but could be fragile if host casing differs between the mysql.user table and CURRENT_USER() output; in practice this works because both derive from the same source.
- The `super_priv` column referenced in the permission check example exists in `mysql.user` but the `SUPER` privilege is deprecated as of MySQL 8.0.17 in favor of more granular dynamic privileges. This is not an error in the post but worth noting for future updates.
