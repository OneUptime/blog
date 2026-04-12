# Validation Summary: How to Reset the MySQL Root Password

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.7.6+
- MySQL 8.0
- Linux (systemd, mysqld_safe)
- Windows (MySQL Server 8.0)

## Sources Consulted
- MySQL 8.0 Reference Manual: Resetting the Root Password (https://dev.mysql.com/doc/refman/8.0/en/resetting-permissions.html)
- MySQL 8.0 Reference Manual: ALTER USER Statement (https://dev.mysql.com/doc/refman/8.0/en/alter-user.html)
- MySQL 8.0 Reference Manual: Server System Variables — skip-grant-tables (https://dev.mysql.com/doc/refman/8.0/en/server-options.html#option_mysqld_skip-grant-tables)
- MySQL 8.0 Reference Manual: Server System Variables — shared-memory, skip-networking (https://dev.mysql.com/doc/refman/8.0/en/server-options.html#option_mysqld_skip-networking)
- MySQL 8.0 Reference Manual: mysqld_safe (https://dev.mysql.com/doc/refman/8.0/en/mysqld-safe.html)

## Issues Found
1. **Windows method missing --skip-networking (security issue)**: In Method 3 Step 2, the server was started with `--shared-memory` but without `--skip-networking`. The `--shared-memory` flag only adds shared memory as an additional connection protocol — it does not disable TCP. This meant the server was accessible over the network with grant tables disabled, which is a security risk. Fixed by adding `--skip-networking` to the server start command and adding `--protocol=memory` to the client connection command so it connects via shared memory instead of TCP.

## Review Notes
- `mysqld_safe` was removed in MySQL 8.4. Since this post targets MySQL 8.0, Method 1 is still valid, but readers using MySQL 8.4+ will need to use `mysqld` directly (as shown in Method 2) or the systemd override approach.
- The Windows service name `mysql` in `net stop mysql` may vary by installation. MySQL 8.0 installers often register the service as `MySQL80`. Users may need to check their service name via `sc query` or Services panel.
- The verification query using `authentication_string` is correct for MySQL 5.7+ and 8.0+. In older versions, the column was named `password`.
