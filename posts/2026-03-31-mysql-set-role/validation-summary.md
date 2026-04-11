# Validation Summary: How to Use SET ROLE Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+) role-based access control
- SET ROLE statement
- SET DEFAULT ROLE statement
- CURRENT_ROLE() function
- activate_all_roles_on_login system variable

## Sources Consulted
- MySQL 8.0 Reference Manual: SET ROLE Statement — https://dev.mysql.com/doc/refman/8.0/en/set-role.html
- MySQL 8.0 Reference Manual: SET DEFAULT ROLE Statement — https://dev.mysql.com/doc/refman/8.0/en/set-default-role.html
- MySQL 8.0 Reference Manual: activate_all_roles_on_login — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_activate_all_roles_on_login
- MySQL 8.0 Reference Manual: CURRENT_ROLE() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_current-role

## Issues Found
1. **Missing `SET ROLE ALL EXCEPT` syntax variant**: The syntax overview omitted `SET ROLE ALL EXCEPT role_name`, which is a documented and useful variant. Added it to the syntax block.
2. **Incorrect MySQL error message**: The comment `-- ERROR: permission denied` is not a real MySQL error. MySQL returns `ERROR 1142: DELETE command denied to user 'bob'@'localhost' for table 'orders'`. Changed the comment to `-- ERROR 1142: DELETE command denied`.
3. **SET ROLE replacement behavior unclear**: In the practical example, `SET ROLE 'app_writer'` replaces the previously active `app_reader` role — it does not add to it. The original comment "Later, activate writer to perform updates" could mislead readers into thinking roles are additive. Clarified the comment to state that it replaces the previous role.

## Review Notes
- The post's claim that stored procedures support SET ROLE is correct per the MySQL docs, which explicitly state that SET ROLE should be used within procedure bodies to change active roles.
- The CURRENT_ROLE() output format with backtick-quoted names (`` `app_reader`@`%` ``) matches the official documentation.
- The post correctly notes that roles are not automatically active upon assignment — this is a key MySQL design decision that the post explains well.
- SET ROLE ALL EXCEPT could merit its own section in a future revision, as it is useful for activating all roles except a high-privilege one.
