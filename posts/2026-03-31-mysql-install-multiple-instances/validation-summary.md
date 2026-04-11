# Validation Summary: How to Install Multiple MySQL Instances on the Same Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- Linux (systemd-based: Ubuntu 22.04+, Rocky Linux 9, Debian 12)
- systemd service units
- InnoDB buffer pool configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: Multiple MySQL Instances — https://dev.mysql.com/doc/refman/8.0/en/multiple-servers.html
- MySQL 8.0 Reference Manual: mysqld --initialize — https://dev.mysql.com/doc/refman/8.0/en/data-directory-initialization.html
- MySQL 8.0 Reference Manual: Server System Variables (datadir, port, socket, pid-file, server-id) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: ALTER USER — https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- systemd.exec man page: RuntimeDirectory, RuntimeDirectoryPreserve — https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd.service man page: Type=notify — https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found

### 1. Mermaid diagram inconsistency with service file names
- **What was wrong:** The mermaid diagram used systemd template-style service names (`mysqld@instance1.service`, `mysqld@instance2.service`), but the tutorial creates standalone service files named `mysqld1.service` and `mysqld2.service`.
- **What was changed:** Updated the diagram labels from `mysqld@instance1.service` / `mysqld@instance2.service` to `mysqld1.service` / `mysqld2.service` to match the actual service files created in Step 4.
- **Why:** Readers following the tutorial would create `mysqld1.service` and `mysqld2.service`, making the diagram confusing and inconsistent.

### 2. Shared RuntimeDirectory without preservation could cause socket file loss
- **What was wrong:** Both systemd service files specified `RuntimeDirectory=mysql` without `RuntimeDirectoryPreserve=yes`. By default (`RuntimeDirectoryPreserve=no`), systemd removes the runtime directory and all its contents when a service stops. Since both instances share `/run/mysql`, stopping one instance could remove the socket and PID files of the other still-running instance.
- **What was changed:** Added `RuntimeDirectoryPreserve=yes` to both `mysqld1.service` and `mysqld2.service`.
- **Why:** This ensures that `/run/mysql` is not cleaned up when one instance stops, preserving the socket and PID files of any other running instances. This directive is supported on all target distros (available since systemd 235; Ubuntu 22.04 ships systemd 249, Rocky Linux 9 and Debian 12 ship systemd 252).

## Review Notes
- `FLUSH PRIVILEGES` is used after `ALTER USER` in Step 6. This is unnecessary for MySQL 8.0+ since account-management statements like `ALTER USER` automatically reload the grant tables. It causes no harm but is redundant. The post could omit it in a future update.
- The configuration uses `utf8mb4_unicode_ci` collation, which is based on UCA 4.0.0. MySQL 8.0+ defaults to `utf8mb4_0900_ai_ci` (UCA 9.0.0). Both are valid; the choice is not an error but worth noting for readers who want the latest Unicode sorting behavior.
- The memory guidance (3G + 3G buffer pool on 8GB) is reasonable but simplified. In practice, each MySQL instance consumes additional memory beyond the buffer pool (per-connection buffers, temporary tables, internal caches). For production workloads, more conservative buffer pool sizing may be warranted.
