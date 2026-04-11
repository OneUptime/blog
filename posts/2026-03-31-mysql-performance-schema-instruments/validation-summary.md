# Validation Summary: How to Configure Performance Schema Instruments in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Performance Schema
- SQL (DDL/DML for `performance_schema.setup_instruments`)
- MySQL server configuration (`my.cnf`)
- systemd service management

## Sources Consulted
- MySQL 8.0 Reference Manual — Performance Schema Instrument Naming Conventions: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-instrument-naming.html
- MySQL 8.0 Reference Manual — The setup_instruments Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html
- MySQL 8.0 Reference Manual — Performance Schema Startup Configuration: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-startup-configuration.html
- MySQL 8.0 Reference Manual — Performance Schema Memory Instrumentation: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html

## Issues Found
No technical issues found.

## Review Notes
- The example instrument `wait/io/file/sql/FRM` references .frm files, which were removed in MySQL 8.0 (replaced by the data dictionary). The instrument name may still exist in the server code but won't generate events in 8.0+. This is acceptable since it's used to illustrate the naming hierarchy, not as a practical monitoring target.
- The post correctly avoids setting TIMED when disabling memory instruments, since memory instruments do not support timing (TIMED is NULL for them).
- The `systemctl restart mysqld` command uses the `mysqld` service name, which is standard on RHEL/CentOS. On Debian/Ubuntu systems, the service is typically named `mysql`. This is a minor platform variance, not an error.
- The overhead characterizations in the table (Low, Medium, High) are reasonable generalizations but are not precise benchmarks. Actual overhead depends on workload and hardware.
