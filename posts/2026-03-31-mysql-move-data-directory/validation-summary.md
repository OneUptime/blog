# Validation Summary: How to Move the MySQL Data Directory to a New Location

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (server administration, data directory management)
- rsync (file synchronization with preserved attributes)
- systemd (service management)
- AppArmor (Ubuntu/Debian mandatory access control)
- SELinux (RHEL/CentOS/Rocky mandatory access control)
- mysqlcheck (database integrity verification)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (`datadir`) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_datadir
- MySQL 8.0 Reference Manual: Data Directory Initialization — https://dev.mysql.com/doc/refman/8.0/en/data-directory-initialization.html
- rsync man page (archive mode, trailing slash behavior) — https://download.samba.org/pub/rsync/rsync.1
- AppArmor Wiki: Policy Layout and tunables/alias — https://gitlab.com/apparmor/apparmor/-/wikis/Policy_Layout
- SELinux `semanage-fcontext` and `restorecon` man pages — https://man7.org/linux/man-pages/man8/semanage-fcontext.8.html
- mysqlcheck reference — https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html

## Issues Found
No technical issues found.

## Review Notes
- On RHEL/CentOS/Rocky systems, the MySQL service name is typically `mysqld` (not `mysql`). The post uses `mysql` throughout, which is correct for Ubuntu/Debian. RHEL users may need to substitute `mysqld` in the `systemctl` commands.
- On RHEL-based systems, the default MySQL socket path is often `/var/lib/mysql/mysql.sock`. After renaming the old data directory to `.bak`, the parent directory for the socket no longer exists, which could prevent MySQL from starting or accepting local connections. Users on RHEL may need to also configure the `socket` directive in `my.cnf` or create a symlink. This is not an error in the existing content but a completeness gap for RHEL users.
- The post does not specify which `my.cnf` file to edit. On Ubuntu/Debian, MySQL configuration is often split across `/etc/mysql/mysql.conf.d/mysqld.cnf` or `/etc/mysql/my.cnf`, while on RHEL it is `/etc/my.cnf`. This is a common simplification in tutorials.
- The recommendation to use `rsync -av` over `cp -r` is sound. An alternative that also works is `cp -a` (equivalent to `cp --preserve=all -R`), but rsync is preferred for large directories due to its resumable nature.
