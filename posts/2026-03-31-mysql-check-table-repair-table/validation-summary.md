# Validation Summary: How to Use MySQL CHECK TABLE and REPAIR TABLE

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- SQL (CHECK TABLE, REPAIR TABLE)
- MyISAM and InnoDB storage engines
- mysqlcheck CLI tool
- MySQL Event Scheduler
- MySQL stored procedures with cursors and prepared statements

## Sources Consulted
- MySQL 8.0 Reference Manual — CHECK TABLE: https://dev.mysql.com/doc/refman/8.0/en/check-table.html
- MySQL 8.0 Reference Manual — REPAIR TABLE: https://dev.mysql.com/doc/refman/8.0/en/repair-table.html
- MySQL 8.0 Reference Manual — Forcing InnoDB Recovery: https://dev.mysql.com/doc/refman/8.0/en/forcing-innodb-recovery.html
- MySQL 8.0 Reference Manual — mysqlcheck: https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html
- MySQL 8.0 Reference Manual — Automatic Initialization and Updating for TIMESTAMP and DATETIME: https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html

## Issues Found
- **Incorrect locking claim in Best Practices**: The original text stated CHECK TABLE "acquires a read lock (or in some modes a write lock) on the table." Per MySQL documentation, CHECK TABLE only ever acquires a read lock — it never acquires a write lock in any mode. REPAIR TABLE is the command that acquires a write lock. Fixed the sentence to correctly distinguish the two: CHECK TABLE acquires a read lock (blocking writes), while REPAIR TABLE acquires a write lock.

## Review Notes
- The sample output table (lines 79-86) combines results from two separate CHECK TABLE statements into one result set. This matches the output of `CHECK TABLE myisam_log, innodb_orders;` (single statement with multiple tables), but the SQL shown uses two separate statements. This is a minor presentation inconsistency, not a technical error.
- The USE_FRM option description references .frm files, which no longer exist in MySQL 8.0 (replaced by the data dictionary). The option still works in MySQL 8.0 using the data dictionary, and the MySQL docs still reference it, so this is acceptable.
- The claim that innodb_force_recovery accepts "values 1-6" is correct in context — 0 is the default (normal startup), and 1-6 are the forced recovery levels.
- The stored procedure for checking all tables is functional but note that each CHECK TABLE execution produces a separate result set, which may behave differently across client libraries.
- `DEFAULT NOW()` in the CREATE TABLE is valid — NOW() is an accepted synonym for CURRENT_TIMESTAMP as a default value.
