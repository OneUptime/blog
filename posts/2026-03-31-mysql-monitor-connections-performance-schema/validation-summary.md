# Validation Summary: How to Monitor MySQL Connections with Performance Schema

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Performance Schema
- MySQL sys schema
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema threads Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html)
- MySQL 8.0 Reference Manual: Performance Schema Connection Tables (accounts, users, hosts) (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-connection-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema events_waits_current Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-waits-current-table.html)
- MySQL 8.0 Reference Manual: Performance Schema Timer Values (picoseconds) (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html)
- MySQL 8.0 Reference Manual: sys Schema session and user_summary Views (https://dev.mysql.com/doc/refman/8.0/en/sys-session.html)
- MySQL 8.0 Reference Manual: Server Status Variables (Threads_%, Connection_errors_%) (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)

## Issues Found
No technical issues found.

## Review Notes
- The `TIMER_WAIT / 1e9 AS wait_ms` conversion is correct: Performance Schema timer values are stored in picoseconds, and dividing by 1e9 yields milliseconds.
- The `events_waits_current` query with `EVENT_NAME LIKE '%connect%'` may return few results in practice since most connection lifecycle instrumentation is in stages/statements rather than waits, but the query itself is valid and will correctly filter for any connection-related wait instruments that are enabled.
- The `\G` formatting directive in the sys schema example is MySQL CLI-specific syntax and would not work in all SQL clients, but this is a common and accepted convention in MySQL tutorials.
- All referenced Performance Schema tables (`threads`, `accounts`, `users`, `hosts`, `events_waits_current`) and their columns are accurately named and correctly used.
