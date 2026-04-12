# Validation Summary: How to Configure MySQL Error Log

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0
- MySQL Error Log (`log_error`)
- MySQL Error Log Components (`log_sink_json`, `log_sink_syseventlog`)
- `log_error_verbosity` system variable
- logrotate (Linux)
- systemd / journalctl

## Sources Consulted
- MySQL 8.0 Reference Manual — Error Log JSON Component: https://dev.mysql.com/doc/refman/8.0/en/error-log-json.html
- MySQL 8.0 Reference Manual — Error Log System Event Log Component: https://dev.mysql.com/doc/refman/8.0/en/error-log-syseventlog.html
- MySQL 8.0 Reference Manual — FLUSH Statement: https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Reference Manual — Server System Variables (log_error_verbosity): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_log_error_verbosity
- MySQL 8.0 Reference Manual — Error Log Configuration: https://dev.mysql.com/doc/refman/8.0/en/error-log-configuration.html

## Issues Found

1. **Missing `INSTALL COMPONENT` for `log_sink_json`**: The JSON error log section configured `log_error_services` to use `log_sink_json` without first installing the component. MySQL 8.0 requires `INSTALL COMPONENT 'file://component_log_sink_json';` before the JSON sink can be referenced in `log_error_services`. Added the installation step.

2. **Misleading `log_error` path in JSON section**: The post set `log_error = /var/log/mysql/error.json`, implying JSON output goes directly to that file. In reality, the JSON sink appends a `.NN.json` suffix to whatever `log_error` is set to (e.g., `error.log` becomes `error.log.00.json`). Setting `log_error` to a `.json` extension would produce the awkward path `error.json.00.json`. Removed the misleading `log_error` override and added an explanation of the actual output file naming convention.

3. **Missing `INSTALL COMPONENT` for `log_sink_syseventlog`**: Same issue as the JSON sink — the syslog section configured `log_error_services` to use `log_sink_syseventlog` without first installing the component. Added the `INSTALL COMPONENT 'file://component_log_sink_syseventlog';` step.

4. **Contradictory InnoDB heading**: The heading read "InnoDB recovery message (after unclean shutdown)" but the log messages shown and the explanation text described log file creation during first start or upgrade — not crash recovery. Changed the heading to "InnoDB log file creation (first start or upgrade)" to match the content.

## Review Notes
- The `REPAIR TABLE` advice for the "Table crashed" error is correct but only applies to MyISAM tables. InnoDB tables do not produce this specific error message and use a different recovery mechanism. The post is contextually correct since the error shown is MyISAM-specific, but future versions could note this distinction.
- The `log_error_verbosity` default of 2 is correct for MySQL 8.0. In MySQL 5.7, the default was 3. The post does not specify a version for this section, but since it covers MySQL 8.0 features (JSON logging), the default is accurate in context.
- The monitoring commands using `grep` with date patterns assume the default timestamp format. If JSON logging is enabled, the timestamp format and field structure differ, requiring different parsing (e.g., `jq`).
