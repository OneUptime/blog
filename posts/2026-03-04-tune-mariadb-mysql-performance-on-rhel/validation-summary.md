# Validation Summary: How to Tune MariaDB/MySQL Performance on RHEL

## Status
validated

## Post Type
Tutorial / Performance tuning guide

## Technologies Covered
- Red Hat Enterprise Linux
- MariaDB Server
- MySQL Server
- InnoDB
- Linux sysctl
- systemd service limits

## Sources Consulted
- MariaDB Documentation: InnoDB system variables - https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-system-variables
- MariaDB Documentation: Configure the InnoDB Buffer Pool - https://mariadb.com/kb/en/configure-the-innodb-buffer-pool/
- MariaDB Documentation: InnoDB Redo Log - https://mariadb.com/kb/en/innodb-redo-log/
- MariaDB Documentation: Slow Query Log Overview - https://mariadb.com/docs/server/server-management/server-monitoring-logs/slow-query-log/slow-query-log-overview
- MariaDB Documentation: mariadb-dumpslow - https://mariadb.com/kb/en/mariadb-dumpslow/
- MariaDB Documentation: systemd - https://mariadb.com/kb/en/systemd/
- MySQL 8.4 Reference Manual: InnoDB Startup Configuration - https://dev.mysql.com/doc/refman/8.4/en/innodb-init-startup-configuration.html
- MySQL 8.4 Reference Manual: InnoDB Startup Options and System Variables - https://dev.mysql.com/doc/mysql/en/innodb-parameters.html
- Red Hat Documentation: Configuring and using database servers on RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/

## Issues Found
- The description mentioned query cache tuning, but the post does not tune query cache and query cache is not appropriate for current MySQL guidance. Removed the query cache reference from the description.
- The active `innodb_buffer_pool_instances` setting is removed in MariaDB 10.6 and ignored/deprecated in MariaDB 10.5. Replaced it with comments explaining that MariaDB 10.5+ uses a single buffer pool instance and MySQL can auto-size instances.
- The active `innodb_log_files_in_group` setting is removed in MariaDB 10.6 and deprecated/ignored in MariaDB 10.5. Removed it from the active configuration.
- The redo log guidance used only `innodb_log_file_size`, which is still used by MariaDB but deprecated in current MySQL when `innodb_redo_log_capacity` is available. Clarified that MariaDB uses `innodb_log_file_size` and added the MySQL 8.0.30+/8.4 `innodb_redo_log_capacity` alternative as a commented setting.
- The slow log analysis commands used `mysqldumpslow`, but current MariaDB documents the tool as `mariadb-dumpslow` while retaining `mysqldumpslow` as an older/symlinked name. Updated the MariaDB commands to `mariadb-dumpslow`.
- The ulimit instructions wrote `/etc/security/limits.d/mysql.conf`, which does not apply to MariaDB when it is launched by systemd. Replaced it with a `mariadb.service` systemd drop-in using `LimitNOFILE=65536` and `systemctl daemon-reload`.

## Review Notes
The post is mostly MariaDB-oriented, matching RHEL's MariaDB service naming and log paths. MySQL users may need to adjust the service name, log path, and redo log variable as noted in the corrected configuration comments.
