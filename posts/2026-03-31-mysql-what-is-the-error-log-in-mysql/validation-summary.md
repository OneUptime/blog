# Validation Summary: What Is the Error Log in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL 8.0
- MySQL Error Log
- InnoDB storage engine
- MySQL error log components (log_sink_json, log_sink_syseventlog)

## Sources Consulted
- MySQL 8.0 Reference Manual: The Error Log — https://dev.mysql.com/doc/refman/8.0/en/error-log.html
- MySQL 8.0 Reference Manual: Error Log Configuration — https://dev.mysql.com/doc/refman/8.0/en/error-log-configuration.html
- MySQL 8.0 Reference Manual: Error Log Components — https://dev.mysql.com/doc/refman/8.0/en/error-log-component-configuration.html
- MySQL 8.0 Reference Manual: FLUSH Statement — https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Reference Manual: Server System Variables (log_error_verbosity) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_log_error_verbosity

## Issues Found
1. **Missing `INSTALL COMPONENT` prerequisite for log sink components**: The section "Configuring Error Log Components" showed `SET GLOBAL log_error_services` commands to switch to JSON (`log_sink_json`) and syslog (`log_sink_syseventlog`) sinks, but omitted the required `INSTALL COMPONENT` step. Without first running `INSTALL COMPONENT 'file://component_log_sink_json'` or `INSTALL COMPONENT 'file://component_log_sink_syseventlog'`, the `SET GLOBAL` commands would fail with an error. Added the `INSTALL COMPONENT` statements before each `SET GLOBAL` command.

2. **Contradictory error level label on redo log encryption message**: The example showed `[ERROR] [MY-011971] Redo log encryption is enabled...` but described it as "Normal InnoDB message when encryption is active." A normal operational message should not be labeled `[ERROR]`. Changed the label to `[Note]` and updated the description to "Normal InnoDB note" to be internally consistent.

## Review Notes
- The macOS Homebrew default path (`/usr/local/var/mysql/`) is correct for Intel Macs. On Apple Silicon Macs with modern Homebrew, the path would be `/opt/homebrew/var/mysql/<hostname>.err`. This is a minor version/platform nuance, not an error.
- The `log_error_verbosity` default of 2 is correct for MySQL 8.0.
- The `FLUSH ERROR LOGS` SQL command is valid in MySQL 8.0 for flushing only the error log file.
- The error codes used in examples (MY-010116, MY-013576, MY-013577, MY-010068, MY-010931) are accurate for the described messages.
