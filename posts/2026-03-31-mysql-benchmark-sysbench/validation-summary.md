# Validation Summary: How to Benchmark MySQL Performance with sysbench

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- sysbench (OLTP benchmarking tool)
- packagecloud (package repository hosting)

## Sources Consulted
- sysbench GitHub repository and documentation: https://github.com/akopytov/sysbench
- sysbench built-in OLTP test scripts (oltp_read_write, oltp_read_only, oltp_write_only) parameter defaults and behavior
- MySQL CREATE USER and GRANT syntax documentation: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- packagecloud akopytov/sysbench repository: https://packagecloud.io/akopytov/sysbench

## Issues Found
- **Missing `--tables` and `--table-size` in read-only and write-only benchmark commands**: The prepare step creates 10 tables with 100,000 rows each, but the read-only and write-only test commands omitted `--tables=10` and `--table-size=100000`. Without `--tables`, sysbench defaults to 1 table, meaning only `sbtest1` would be queried instead of all 10 prepared tables. Without `--table-size`, it defaults to 10,000, causing queries to only target the first 10,000 rows of each table rather than all 100,000 — artificially inflating buffer pool cache hit rates and producing misleading benchmark results. Added both parameters to both commands for consistency with the prepare and run sections.

## Review Notes
- The sample output math is internally consistent: 14,020 transactions x 20 queries/transaction (14 reads + 4 writes + 2 other) = 280,400 total queries, with correct per-category breakdowns.
- The TPS range of 200-1000 for moderate hardware is a reasonable general estimate, though actual results vary significantly based on storage (SSD vs HDD), InnoDB buffer pool size, and MySQL version.
- The post uses a plaintext password in the benchmark commands and SQL setup. This is standard for local benchmark examples and not a concern for production guidance, but readers should understand this is for isolated test environments only.
