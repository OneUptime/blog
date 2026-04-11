# Validation Summary: How to Start and Stop the MySQL Service on Linux

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (Community Server)
- systemd / systemctl
- Linux (Debian/Ubuntu, RHEL-based distributions)
- journalctl
- mysqladmin
- ss (socket statistics)

## Sources Consulted
- MySQL 8.0 Reference Manual: The Server Shutdown Process (https://dev.mysql.com/doc/refman/8.0/en/server-shutdown.html)
- MySQL 8.0 Reference Manual: innodb_fast_shutdown (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_fast_shutdown)
- MySQL 8.0 Reference Manual: Unix Signal Handling (https://dev.mysql.com/doc/refman/8.0/en/unix-signal-response.html)
- MySQL 8.0 Reference Manual: SET GLOBAL Syntax (https://dev.mysql.com/doc/refman/8.0/en/set-variable.html)
- systemd systemctl man page (https://www.freedesktop.org/software/systemd/man/systemctl.html)

## Issues Found

### Issue 1: Incorrect description of `systemctl stop` behavior (Line 50)
- **What was wrong:** The post stated "Stopping waits for active connections to finish or for the configured `innodb_fast_shutdown` to flush buffers." This implies MySQL waits for connections to complete their work before shutting down, which is incorrect.
- **What was changed:** Replaced with an accurate description: SIGTERM is sent, active threads finish their current statement and then disconnect, and InnoDB flushes buffers based on `innodb_fast_shutdown`.
- **Why:** MySQL's shutdown process signals threads to terminate — they complete the currently executing statement and disconnect. It does not wait for connections to finish their overall work.

### Issue 2: Incorrect claim about `systemctl reload` applying configuration changes (Lines 60-68)
- **What was wrong:** The post claimed that `systemctl reload mysql` could apply dynamic variable changes like `max_connections` from `my.cnf`. This is incorrect — SIGHUP causes MySQL to flush tables, rotate logs, and flush caches, but it does NOT re-read `my.cnf` or apply any configuration variable changes.
- **What was changed:** Rewrote the section to accurately describe what SIGHUP does, and added the correct method for changing dynamic variables at runtime (`SET GLOBAL` SQL statements).
- **Why:** Per MySQL documentation, SIGHUP flushes tables and logs but does not reload configuration. Dynamic variables must be changed via `SET GLOBAL` from the MySQL client.

## Review Notes
- The Arch Linux service name listing (`mysqld`) assumes MySQL is installed from AUR, since Arch's official repositories ship MariaDB by default (with service name `mariadb`). This is technically accurate for MySQL specifically but could cause confusion for Arch users who have the default MariaDB installation.
- All systemctl commands, journalctl commands, ss flags, and mysqladmin usage are correct.
- The mermaid diagram and example outputs are realistic and well-formatted.
- The graceful shutdown vs. kill explanation is sound advice, though the exact behavior depends on the `innodb_fast_shutdown` setting (0, 1, or 2).
