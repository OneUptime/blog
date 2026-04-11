# Validation Summary: How to Respond to MySQL Data Corruption Incidents

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- MyISAM storage engine
- mysqldump
- innodb_force_recovery

## Sources Consulted
- MySQL 8.0 Reference Manual: REPAIR TABLE Statement - https://dev.mysql.com/doc/refman/8.0/en/repair-table.html
- MySQL 8.0 Reference Manual: Forcing InnoDB Recovery - https://dev.mysql.com/doc/refman/8.0/en/forcing-innodb-recovery.html
- MySQL 8.0 Reference Manual: FLUSH Statement - https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Reference Manual: CHECK TABLE Statement - https://dev.mysql.com/doc/refman/8.0/en/check-table.html
- MySQL 8.0 Reference Manual: mysqldump - https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html

## Issues Found

1. **Restore from Backup procedure had MySQL stopped during mysql client restore**: The original instructions said to stop MySQL, then run `mysql -u root -p myapp < backup.sql`, then start MySQL. The `mysql` client is a client program that connects to a running MySQL server -- it cannot restore a dump file when the server is stopped. Removed the stop/start commands and added a comment clarifying MySQL must be running.

2. **innodb_force_recovery DML restriction was inaccurate**: The post stated "At recovery level 3 or above, do NOT write to the database." In MySQL 8.0, InnoDB prevents INSERT, UPDATE, and DELETE operations at any non-zero recovery level (innodb_force_recovery > 0), not just level 3+. Updated the text to reflect the MySQL 8.0 behavior.

## Review Notes
- The post correctly notes that REPAIR TABLE is MyISAM-only. In MySQL 8.0, running REPAIR TABLE on an InnoDB table is accepted but maps to ALTER TABLE ... FORCE, which rebuilds the table without fixing actual data page corruption. The blog's advice to use different approaches for InnoDB is sound.
- The `FLUSH TABLES orders WITH READ LOCK` command is valid syntax and appropriate for the containment scenario described.
- The innodb_force_recovery DML restriction behavior differs between MySQL versions (5.7 vs 8.0). The fix targets MySQL 8.0 behavior. In MySQL 5.7, DML was allowed at lower force recovery levels but could be dangerous.
- The prevention recommendations are all sound and follow MySQL best practices.
