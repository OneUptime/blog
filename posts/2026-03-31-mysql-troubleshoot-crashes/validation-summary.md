# Validation Summary: How to Troubleshoot MySQL Crashes

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (8.0+)
- InnoDB storage engine
- Linux OOM killer
- GDB (GNU Debugger) for core dump analysis
- systemd / journalctl
- MySQL replication (relay log recovery, sync_binlog)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Using a Stack Trace (core dumps) — https://dev.mysql.com/doc/refman/8.0/en/using-stack-trace.html
- MySQL 8.0 Reference Manual: The General Query Log — https://dev.mysql.com/doc/refman/8.0/en/query-log.html
- MySQL 8.0 Reference Manual: CHECK TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/check-table.html
- MySQL 8.0 Reference Manual: mysqlcheck — https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html
- MySQL 8.0 Reference Manual: Replication and Transaction Inconsistencies — https://dev.mysql.com/doc/refman/8.0/en/replication-features-transaction-inconsistencies.html
- Linux kernel documentation: OOM killer behavior and dmesg/journalctl output patterns
- GDB documentation: backtrace (bt) command usage

## Issues Found
- **Summary section: incorrect crash context for `relay_log_recovery`** — The summary stated "Use `relay_log_recovery = ON` to prevent replication issues after primary crashes." This is incorrect. `relay_log_recovery` is a replica-side setting that helps when the **replica** crashes and restarts — it discards incomplete relay logs and re-fetches them from the primary. The primary crashing does not corrupt relay logs on the replica. Changed "primary crashes" to "replica crashes."

## Review Notes
- The `core-file` server option was deprecated in MySQL 8.0.34. The post does not specify a MySQL version, so the advice is still broadly applicable, but readers on newer versions should be aware of this deprecation.
- The `relay_log_recovery` variable was deprecated in MySQL 8.4.0 in favor of GTID-based recovery. This is not an error for the current MySQL 8.0 LTS audience but may become outdated.
- The `journalctl -k | grep -i "oom killer"` command uses a literal space, while kernel messages typically use "oom-killer" (with a hyphen). The companion `dmesg` command with `"oom\|killed process"` covers this gap, so it is not a blocking issue.
- The Enabling Core Dumps section mixes MySQL config file entries and shell commands in a single `bash` code block. This is a stylistic/presentation choice rather than a technical error.
