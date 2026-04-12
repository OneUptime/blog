# Validation Summary: How to Load Test MySQL with sysbench

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- sysbench (OLTP benchmarking tool)
- Bash scripting (for automated thread-scaling tests)

## Sources Consulted
- sysbench GitHub repository and documentation (https://github.com/akopytov/sysbench)
- sysbench 1.0.x `--help` output and built-in test script documentation
- MySQL CREATE USER / GRANT syntax documentation (https://dev.mysql.com/doc/refman/8.0/en/create-user.html)

## Issues Found
1. **Fabricated 99th percentile in sample output**: The sample sysbench output included a `99th percentile: 292.60` line. sysbench only displays a single percentile value in its output, controlled by the `--percentile` flag (defaults to 95). There is no way to display both 95th and 99th percentile simultaneously in standard output. Removed the 99th percentile line from the sample output and the corresponding p99 bullet from the "Key metrics" interpretation section.

## Review Notes
- The intro section mentions sysbench reports "Latency percentiles (p95, p99)". While only one percentile is shown per run by default, sysbench can be configured to report p99 via `--percentile=99`, so this claim is acceptable in a general description.
- The sample output numbers are internally consistent: 8,053 transactions x 14 reads = 112,742 reads, x 4 writes = 32,212 writes, x 2 other (BEGIN/COMMIT) = 16,106 other, totaling 161,060 queries. TPS and QPS figures match.
- All sysbench CLI parameter names (`--mysql-host`, `--mysql-port`, `--mysql-db`, `--mysql-user`, `--mysql-password`, `--tables`, `--table-size`, `--threads`, `--time`, `--report-interval`) are correct for sysbench 1.0+.
- All test script names (`oltp_read_write`, `oltp_read_only`, `oltp_write_only`, `oltp_insert`) and actions (`prepare`, `run`, `cleanup`) are correct.
- The SQL setup commands are standard and correct for MySQL 5.7+/8.0.
