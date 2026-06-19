# Validation Summary: How to Fix 'Table Is Marked as Crashed' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- MySQL
- MyISAM
- InnoDB
- mysqlcheck
- myisamchk
- mysqldump
- Percona XtraBackup
- MySQL server configuration

## Sources Consulted
- MySQL 8.4 Reference Manual: REPAIR TABLE Statement - https://dev.mysql.com/doc/refman/8.4/en/repair-table.html
- MySQL 8.4 Reference Manual: mysqlcheck - https://dev.mysql.com/doc/refman/8.4/en/mysqlcheck.html
- MySQL 8.4 Reference Manual: myisamchk - https://dev.mysql.com/doc/refman/8.4/en/myisamchk.html
- MySQL 8.0 Reference Manual: myisamchk Repair Options - https://dev.mysql.com/doc/refman/8.0/en/myisamchk-repair-options.html
- MySQL 8.4 Reference Manual: Forcing InnoDB Recovery - https://dev.mysql.com/doc/refman/8.4/en/forcing-innodb-recovery.html
- MySQL 8.4 Reference Manual: Rebuilding or Repairing Tables or Indexes - https://dev.mysql.com/doc/refman/8.4/en/rebuilding-tables.html
- MySQL 8.4 Reference Manual: InnoDB Disk I/O / Doublewrite Buffer - https://dev.mysql.com/doc/refman/8.4/en/innodb-disk-io.html
- MySQL 8.4 Reference Manual: InnoDB Checkpoints - https://dev.mysql.com/doc/refman/8.4/en/innodb-checkpoints.html
- MySQL Reference Manual: mysqldump - https://dev.mysql.com/doc/refman/8.1/en/mysqldump.html
- MySQL Reference Manual: OPTIMIZE TABLE - https://dev.mysql.com/doc/en/optimize-table.html
- Percona XtraBackup documentation: Create a full backup - https://docs.percona.com/percona-xtrabackup/8.0/create-full-backup.html

## Issues Found
- The post described `myisamchk -r -q` as "safe repair." This is actually quick repair, which modifies only the index file. Changed the label to "Quick repair."
- The post showed `myisamchk -r -o` as "recover with best effort." The documented safe recovery option is `-o` / `--safe-recover`; changed the command to `myisamchk -o`.
- The full MyISAM recovery sequence used the same incorrect safe-recovery flag. Updated it to try normal recovery, then safe recovery, then forced recovery as the last resort.
- The MyISAM emergency extraction comments said `myisamchk` extracts rows. `myisamchk` repairs/checks MyISAM tables; it does not export rows. Updated the comment to describe the index-only repair before copying rows.
- The InnoDB emergency extraction section suggested installing Percona Toolkit to extract InnoDB tablespace data. Percona Toolkit is not the documented utility for that workflow. Replaced it with a dump attempt under `innodb_force_recovery` and fallback guidance to restore from backup or use a specialist recovery tool.
- The `innodb_fast_shutdown = 0` comment said it waits for transactions to complete. The setting performs a slow shutdown that completes purge and change buffer merge work. Updated the comment accordingly.
- The heading "REPAIR TABLE (Online)" could imply nonblocking online repair. MySQL documents that `mysqlcheck`/maintenance operations lock tables while processed. Changed the heading to "REPAIR TABLE (Server Running)."

## Review Notes
The guide is technically sound after the corrections. Future improvements could add stronger warnings to back up affected table files before repair and avoid putting MySQL passwords directly on the command line in automation scripts.
