# Validation Summary: How to Respond to MySQL Server Down Incidents

## Status
validated

## Post Type
Runbook / Incident Response Guide

## Technologies Covered
- MySQL (InnoDB, MyISAM storage engines)
- systemd / systemctl
- Linux system utilities (dmesg, df, free, ulimit)
- MySQL replication
- mysqlcheck utility
- mysqldump utility

## Sources Consulted
- MySQL 8.0 Reference Manual: REPAIR TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/repair-table.html
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: Forcing InnoDB Recovery — https://dev.mysql.com/doc/refman/8.0/en/forcing-innodb-recovery.html
- MySQL 8.0 Reference Manual: mysqlcheck — https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html
- systemd documentation: systemctl enable vs Restart= directive — https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found

### Issue 1: REPAIR TABLE does not work on InnoDB tables
- **What was wrong:** Step 6 was titled "Repair Corrupted Tables" and stated "If InnoDB tables are corrupted" but then recommended `REPAIR TABLE`, which only works for MyISAM, ARCHIVE, and CSV storage engines. It does not support InnoDB.
- **What was changed:** Reworded the section to clarify that `mysqlcheck --auto-repair` and `REPAIR TABLE` apply to MyISAM tables. Added guidance for InnoDB corruption: use `innodb_force_recovery` to start the server, then dump and restore data. Reordered `CHECK TABLE` before `REPAIR TABLE` to reflect the typical diagnostic workflow.
- **Why:** Running `REPAIR TABLE` on an InnoDB table returns an error or no-op. Users following the original instructions for InnoDB corruption would not achieve recovery and could waste critical time during an incident.

### Issue 2: systemctl enable does not configure automatic restart on failure
- **What was wrong:** The Post-Incident Actions section had the comment "Enable automatic restart on failure" next to `systemctl enable mysql`. `systemctl enable` only configures the service to start at boot — it does not control restart-on-failure behavior.
- **What was changed:** Corrected the comment to "Enable MySQL to start at boot" and added a note explaining that automatic restart on failure is controlled by the `Restart=on-failure` directive in the systemd unit file, with a command to check the current configuration.
- **Why:** Confusing `systemctl enable` with restart-on-failure could leave operators believing their server will auto-recover from crashes when it may not.

## Review Notes
- The post uses `SHOW REPLICA STATUS` and `Seconds_Behind_Source` / `Replica_IO_Running` / `Replica_SQL_Running`, which are the modern syntax introduced in MySQL 8.0.22. Older MySQL versions use `SHOW SLAVE STATUS` with `Seconds_Behind_Master` / `Slave_IO_Running` / `Slave_SQL_Running`. A version note could be helpful for readers on older MySQL versions.
- The query checking `information_schema.tables WHERE table_comment LIKE '%crashed%'` is a reasonable heuristic for MyISAM tables but will not detect InnoDB corruption. This is acceptable as-is since the context is a general check.
- The default MySQL error log path (`/var/log/mysql/error.log`) and data directory (`/var/lib/mysql`) are Ubuntu/Debian defaults. On RHEL/CentOS systems, paths differ (e.g., `/var/log/mysqld.log`). This is a minor portability note, not an error.
