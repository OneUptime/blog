# Validation Summary: How to Configure Performance Schema Consumers in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Performance Schema
- MySQL setup_consumers table
- MySQL my.cnf configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Consumer Hierarchy (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-consumer-filtering.html)
- MySQL 8.0 Reference Manual: setup_consumers Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-consumers-table.html)
- MySQL 8.0 Reference Manual: Performance Schema Startup Configuration (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-startup-configuration.html)

## Issues Found
- **Incomplete sample output table**: The example output from `SELECT NAME, ENABLED FROM performance_schema.setup_consumers` was missing 4 consumers: `events_transactions_history`, `events_transactions_history_long`, `events_waits_history`, and `events_waits_history_long`. MySQL 8.0's `setup_consumers` table contains 15 rows, but only 11 were shown. Added the missing 4 rows with their correct default ENABLED values (`YES` for `events_transactions_history`, `NO` for the other three).

## Review Notes
- The consumer hierarchy diagram is accurate and matches the official MySQL documentation.
- All SQL UPDATE statements use correct syntax for modifying `setup_consumers` at runtime.
- The `my.cnf` option format (`performance-schema-consumer-*`) is correct.
- The claim that `events_statements_history` keeps the last 10 statements per thread is accurate as a default, though this is configurable via `performance_schema_events_statements_history_size`.
- The `sudo systemctl restart mysqld` command uses the `mysqld` service name, which is correct for RHEL/CentOS-based systems. On Debian/Ubuntu, the service name is typically `mysql`.
