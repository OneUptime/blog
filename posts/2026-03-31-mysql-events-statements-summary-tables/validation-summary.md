# Validation Summary: How to Use the events_statements_summary Tables in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL Performance Schema
- SQL (statement summary tables, digest-based query analysis)

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Statement Summary Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema Timer Representation (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html)
- MySQL 8.0 Reference Manual: setup_instruments Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html)
- MySQL 8.0 Reference Manual: setup_consumers Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-consumers-table.html)

## Issues Found
No technical issues found.

## Review Notes
- Performance Schema timer values are stored in picoseconds. The post correctly uses `/1e9` to convert to milliseconds and `/1e12` to convert to seconds.
- All six summary table names listed are accurate and exist in MySQL 5.7+/8.0+.
- The post does not mention `events_statements_summary_by_program`, which also exists but is less commonly used. This omission is acceptable.
- The `DIGEST_TEXT` column can be truncated for very long queries (default max length is 1024 bytes, configurable via `performance_schema_max_digest_length`). The post does not mention this, but it is a minor detail that does not affect correctness.
- The TRUNCATE approach for resetting statistics is correct — Performance Schema summary tables support TRUNCATE to reset aggregated values.
