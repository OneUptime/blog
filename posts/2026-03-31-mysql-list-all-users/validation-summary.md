# Validation Summary: How to List All Users in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+
- mysql.user system table
- information_schema.USER_PRIVILEGES view
- MySQL command-line client

## Sources Consulted
- MySQL 8.0 Reference Manual: mysql.user Grant Table (https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html#grant-tables-users-db)
- MySQL 8.0 Reference Manual: information_schema.USER_PRIVILEGES (https://dev.mysql.com/doc/refman/8.0/en/information-schema-user-privileges-table.html)
- MySQL 8.0 Reference Manual: Reserved User Accounts (https://dev.mysql.com/doc/refman/8.0/en/reserved-accounts.html)
- MySQL 8.0 Reference Manual: Account Locking (https://dev.mysql.com/doc/refman/8.0/en/account-locking.html)
- MySQL 8.0 Reference Manual: mysql Client (https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html)

## Issues Found
No technical issues found.

## Review Notes
- The `information_schema.USER_PRIVILEGES` section is technically correct but has a practical limitation worth noting: this view only shows users who have been granted global-level privileges. Users with only database-level or table-level grants will not appear. Additionally, non-privileged users can only see their own entries, not all users' privileges. This means it is not a complete replacement for querying `mysql.user` when a full user list is needed. The post does not explicitly claim completeness, so this is not an error, but readers should be aware of the limitation.
- The `authentication_string = ''` check for passwordless accounts is correct for the default `caching_sha2_password` and `mysql_native_password` plugins. For socket-based authentication plugins (e.g., `auth_socket`), an empty `authentication_string` does not indicate a security risk since authentication is handled externally. This edge case does not warrant a correction but is worth noting.
- The post is implicitly targeting MySQL 8.0+ based on the system accounts listed (`mysql.infoschema`, `mysql.session`, `mysql.sys`) and the columns referenced (`account_locked`, `password_last_changed`). These features are available from MySQL 5.7.6+, with `mysql.infoschema` being specific to MySQL 8.0+.
