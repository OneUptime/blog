# Validation Summary: How MySQL GTID Replication Works Internally

## Status
validated

## Post Type
Conceptual / Guide

## Technologies Covered
- MySQL 8.0 GTID replication (`gtid_mode`, `enforce_gtid_consistency`, `@@GLOBAL.gtid_executed`, `@@GLOBAL.gtid_purged`)
- `CHANGE REPLICATION SOURCE TO ... SOURCE_AUTO_POSITION = 1`, `START REPLICA`, `SHOW REPLICA STATUS`, `RESET REPLICA ALL`
- `SET GTID_NEXT` empty-transaction injection, `GTID_SUBTRACT()`, `performance_schema.replication_connection_status`

## Sources Consulted
- MySQL 8.0 Reference Manual — Restrictions on Replication with GTIDs — https://dev.mysql.com/doc/refman/8.0/en/replication-gtids-restrictions.html (verified the exact GTID-consistency restrictions: mixed transactional/non-transactional engines always disallowed; `CREATE TABLE ... SELECT` disallowed only prior to 8.0.21; temp-table-in-transaction restriction applies only under `binlog_format=STATEMENT`)
- MySQL 8.0 Reference Manual — Global Transaction ID System Variables — https://dev.mysql.com/doc/refman/8.0/en/replication-options-gtids.html (GTID format `source_uuid:transaction_id`, `gtid_executed`/`gtid_purged` semantics)

## Issues Found
- The "GTID Restrictions" section was outdated/imprecise and was corrected:
  - It listed `CREATE TABLE ... SELECT` as flatly forbidden. Per the 8.0 manual, this restriction was lifted in MySQL 8.0.21 on storage engines supporting atomic DDL (e.g. InnoDB). Updated to state the version-specific behavior.
  - It listed `CREATE TEMPORARY TABLE inside transactions` as flatly forbidden. This restriction only applies when `binlog_format = STATEMENT`; with the default `binlog_format = ROW` (or `MIXED`), temporary tables are allowed inside transactions since MySQL 8.0.13. Qualified accordingly.
  - Reworded the mixed-engine restriction to match the manual's wording (updates mixing transactional and non-transactional storage engines in the same statement/transaction).

## Review Notes
- GTID format `source_uuid:transaction_number` (example `3E11FA47-71CA-11E1-9E33-C80AA9429562:42`) is correct and matches the manual.
- `CHANGE REPLICATION SOURCE TO` with `SOURCE_AUTO_POSITION = 1`, `START REPLICA`, `SHOW REPLICA STATUS`, `STOP REPLICA`, `RESET REPLICA ALL`, and `SET GLOBAL SQL_REPLICA_SKIP_COUNTER` are the correct MySQL 8.0 (8.0.22+/8.0.26+) terminology and were left as-is.
- Empty-transaction injection via `SET GTID_NEXT = '<uuid>:N'; BEGIN; COMMIT; SET GTID_NEXT='AUTOMATIC';` to skip a problematic GTID is correct.
- `GTID_SUBTRACT(received_transaction_set, @@GLOBAL.gtid_executed)` against `performance_schema.replication_connection_status` is a valid way to compute not-yet-applied GTIDs.
- `log_bin = ON` in the config snippet is a slightly informal spelling (the option normally takes a base filename and binary logging is enabled by default in MySQL 8.0), but it is accepted and conveys intent; left as-is.
