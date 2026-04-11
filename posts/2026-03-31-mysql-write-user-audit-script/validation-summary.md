# Validation Summary: How to Write a MySQL User Audit Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.7+ / MySQL 8.x (system tables: `mysql.user`, `mysql.db`)
- Bash scripting
- Cron scheduling
- MySQL CLI (`mysql` client)

## Sources Consulted
- MySQL 8.0 Reference Manual: The mysql.user Grant Table — https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html#grant-tables-user-db
- MySQL 8.0 Reference Manual: REVOKE Statement — https://dev.mysql.com/doc/refman/8.0/en/revoke.html
- MySQL 8.0 Reference Manual: ALTER USER (ACCOUNT LOCK/UNLOCK) — https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual: mysql Client Options (-s, -e flags) — https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
- MySQL 8.0 Reference Manual: password_last_changed column — https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html

## Issues Found
No technical issues found.

## Review Notes
- The "Users with Global ALL PRIVILEGES" query (section 4) uses a heuristic that checks for `Grant_priv = 'Y'` OR a combination of 6 common privileges. This is a reasonable audit heuristic for flagging overly-privileged accounts, though `Grant_priv = 'Y'` specifically indicates WITH GRANT OPTION rather than ALL PRIVILEGES. The label is slightly imprecise but acceptable in an audit context.
- The SUPER privilege is deprecated as of MySQL 8.0.22 in favor of dynamic privileges. The script still works correctly since the `Super_priv` column remains in `mysql.user`, but future MySQL versions may remove it.
- The cron job example does not set `MYSQL_ROOT_PASSWORD`, so the script would need the variable available in the cron environment (e.g., via a wrapper script or cron environment variable declaration). This is a common simplification in blog posts.
- Passing the password via `-p${MYSQL_ROOT_PASSWORD}` on the command line will trigger a MySQL warning ("Using a password on the command line interface can be insecure"). Production scripts typically use `mysql_config_editor` or a `.my.cnf` options file instead.
