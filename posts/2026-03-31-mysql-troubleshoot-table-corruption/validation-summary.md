# Validation Summary: How to Troubleshoot MySQL Table Corruption

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (InnoDB and MyISAM storage engines)
- CHECK TABLE and REPAIR TABLE SQL statements
- mysqlcheck command-line utility
- myisamchk command-line utility
- mysqldump for backup and restore
- innodb_force_recovery server variable
- SELECT INTO OUTFILE for data export
- InnoDB configuration parameters (doublewrite buffer, flush method, checksums)

## Sources Consulted
- MySQL 8.0 Reference Manual: CHECK TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/check-table.html
- MySQL 8.0 Reference Manual: REPAIR TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/repair-table.html
- MySQL 8.0 Reference Manual: Forcing InnoDB Recovery — https://dev.mysql.com/doc/refman/8.0/en/forcing-innodb-recovery.html
- MySQL 8.0 Reference Manual: mysqlcheck — https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html
- MySQL 8.0 Reference Manual: myisamchk — https://dev.mysql.com/doc/refman/8.0/en/myisamchk.html
- MySQL 8.0 Reference Manual: InnoDB Startup Options — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: SELECT ... INTO OUTFILE — https://dev.mysql.com/doc/refman/8.0/en/select-into.html

## Issues Found
1. **Incorrect innodb_force_recovery level 6 description**: The post stated "Level 6: Do not look at undo logs" but that is actually Level 5 (SRV_FORCE_NO_UNDO_LOG_SCAN). Level 6 (SRV_FORCE_NO_LOG_REDO) means "Do not do the redo log roll-forward in connection with recovery." Fixed by correcting the level number and adding the missing Level 5 entry with the correct descriptions:
   - Level 1: Changed from "Skip corrupted pages" to "Ignore corrupt pages and let the server run" for precision.
   - Level 5: Added with "Do not look at undo logs" (was previously mislabeled as Level 6).
   - Level 6: Corrected to "Do not do the redo log roll-forward."

## Review Notes
- The statement "InnoDB does not support REPAIR TABLE" is a simplification. In MySQL 5.7+, REPAIR TABLE can be run on InnoDB tables but it effectively performs an ALTER TABLE ... FORCE (table rebuild), which is not corruption repair in the traditional sense. The blog's advice to use dump/restore or innodb_force_recovery for actual InnoDB corruption is correct and practical.
- The post omits Levels 2 and 4 of innodb_force_recovery (background thread prevention and insert buffer merge prevention, respectively). This is acceptable for a focused troubleshooting guide, as Levels 1, 3, 5, and 6 are the most commonly referenced.
- MyISAM coverage is still useful as legacy applications may use it, but a note that MyISAM is largely deprecated in favor of InnoDB could benefit readers in the future.
- The default error log path `/var/log/mysql/error.log` is Debian/Ubuntu-specific. On RHEL/CentOS systems it is typically `/var/log/mysqld.log`. This is acceptable for a tutorial but worth noting.
