# Validation Summary: How to Use SHOW RELAYLOG EVENTS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+
- MySQL Replication (relay logs, GTID-based replication)
- SHOW RELAYLOG EVENTS statement
- SHOW REPLICA STATUS statement

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW RELAYLOG EVENTS — https://dev.mysql.com/doc/refman/8.0/en/show-relaylog-events.html
- MySQL 8.0 Reference Manual: Replication and Binary Logging Options (gtid_next variable scope) — https://dev.mysql.com/doc/refman/8.0/en/replication-options-gtids.html
- MySQL 8.0 Reference Manual: Skipping Transactions — https://dev.mysql.com/doc/refman/8.0/en/replication-administration-skip.html

## Issues Found
1. **`SET GLOBAL gtid_next` is invalid (lines 90, 93)**: The `gtid_next` system variable has session scope only and cannot be set with `SET GLOBAL`. Using `SET GLOBAL gtid_next` would produce the error: `Variable 'gtid_next' is a SESSION variable and can't be used with SET GLOBAL`. Fixed both occurrences to use `SET GTID_NEXT` (which defaults to session scope), matching the official MySQL documentation for skipping transactions.

## Review Notes
- The post omits the optional `FOR CHANNEL channel` clause from the SHOW RELAYLOG EVENTS syntax. This clause is needed in multi-source replication setups. Not an error since the basic syntax is correct, but could be mentioned in a future update.
- The post does not mention that SHOW RELAYLOG EVENTS requires the REPLICATION SLAVE privilege. This is a minor omission.
- The "Listing All Relay Log Files" section suggests using SHOW REPLICA STATUS, which only shows the current relay log file, not all files. The `ls` command alternative is more accurate for this purpose. The relay log index file (e.g., `mysql-relay-bin.index`) could also be mentioned as an alternative.
- All SQL syntax, output column names, event types, and general explanations of relay log behavior are accurate.
