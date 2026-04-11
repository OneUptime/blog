# Validation Summary: How to Monitor MySQL Network Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7+, 8.0+)
- MySQL Performance Schema
- MySQL information_schema
- Linux networking tools (nethogs, ss, sar, nload)
- Percona Toolkit (pt-query-digest)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server Status Variables (Bytes_sent, Bytes_received) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: performance_schema.global_status — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual: performance_schema.status_by_thread — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual: performance_schema.events_statements_summary_by_digest — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual: performance_schema.threads — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: Connection Compression Control — https://dev.mysql.com/doc/refman/8.0/en/connection-compression-control.html
- MySQL 8.0 Reference Manual: information_schema.PROCESSLIST — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html

## Issues Found
1. **Invalid `net_compression_level` system variable**: The post included `SET SESSION net_compression_level = 1;` as a way to enable compression for a session. `net_compression_level` is not a valid MySQL system variable in any GA release. Additionally, MySQL connection compression is negotiated during the client/server handshake and cannot be enabled or changed mid-session via a SET statement. Fixed by replacing the SQL snippet with correct `mysql --compress` and `mysql --compression-algorithms` CLI connection examples.

## Review Notes
- All SQL queries against performance_schema and information_schema use correct table and column names for MySQL 5.7+/8.0+.
- The timer division by 1e12 (picoseconds to seconds) in the digest query is correct.
- The `--compress` client option is deprecated as of MySQL 8.0.18 in favor of `--compression-algorithms`. The post now shows both options.
- OS-level commands (nethogs, ss, sar, nload) use correct syntax and flags.
- The `ss` filter syntax for MySQL port 3306 is correct.
