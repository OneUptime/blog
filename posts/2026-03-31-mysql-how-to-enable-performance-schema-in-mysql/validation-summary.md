# Validation Summary: How to Enable Performance Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Performance Schema
- MySQL server configuration (my.cnf)
- systemd (service management)

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema (https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html)
- MySQL 8.0 Reference Manual: Performance Schema System Variables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variables.html)
- MySQL 8.0 Reference Manual: Performance Schema Setup Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema Statement Summary Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema Memory Summary Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema Wait Summary Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-wait-summary-tables.html)

## Issues Found
No technical issues found.

## Review Notes
- The `setup_threads` table and memory instrumentation (`memory_summary_global_by_event_name`) were introduced in MySQL 5.7, not 5.6. Since the post does not claim these specific features are available in 5.6.6, this is not an error, but readers targeting MySQL 5.6 should be aware.
- Timer values in Performance Schema are stored in picoseconds. All unit conversions in the post are correct: dividing by 1e9 yields milliseconds, dividing by 1e12 yields seconds.
- The `systemctl restart mysql` command uses the `mysql` service name, which is standard on Debian/Ubuntu. On RHEL/CentOS, the service is typically named `mysqld`. This is a minor platform variance, not an error.
