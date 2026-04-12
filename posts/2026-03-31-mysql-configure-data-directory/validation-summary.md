# Validation Summary: How to Configure the MySQL Data Directory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7 and 8.0)
- InnoDB storage engine
- SELinux
- AppArmor
- Linux file permissions

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (`datadir`) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_datadir
- MySQL 8.0 Reference Manual: Data Directory Initialization — https://dev.mysql.com/doc/refman/8.0/en/data-directory-initialization.html
- MySQL 8.0 Reference Manual: MySQL Data Directory — https://dev.mysql.com/doc/refman/8.0/en/data-directory.html
- MySQL 8.0 Reference Manual: InnoDB Redo Log (8.0.30 changes) — https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 Reference Manual: SELinux File Context — https://dev.mysql.com/doc/refman/8.0/en/selinux-file-context.html

## Issues Found
- **`ib_logfile0` version annotation was misleading**: The directory listing annotated `ib_logfile0` as "(MySQL 5.7)", implying it only exists in MySQL 5.7. In reality, `ib_logfile0` and `ib_logfile1` exist in MySQL 5.7 and MySQL 8.0 through 8.0.29. Starting with MySQL 8.0.30, redo logs moved to the `#innodb_redo/` directory. Changed the annotation from "(MySQL 5.7)" to "(before 8.0.30)" for accuracy.

## Review Notes
- The error log path (`/var/log/mysql/error.log`) is the common default on Debian/Ubuntu. On RHEL/CentOS, it is typically `/var/log/mysqld.log`. The post doesn't mention this difference, but it's acceptable for a tutorial that picks one common path.
- The directory listing mixes files from different MySQL versions (e.g., `ib_logfile0` for pre-8.0.30, `mysql.ibd` for 8.0+, `binlog.*` for 8.0 defaults). This is reasonable since it shows what a reader might encounter, but readers should be aware not all files appear in every version.
- The `binlog.*` naming convention is the MySQL 8.0 default. In MySQL 5.7, the default prefix was `mysql-bin`. This is not incorrect since the post doesn't claim otherwise, but worth noting for readers on older versions.
