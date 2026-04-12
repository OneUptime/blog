# Validation Summary: How to Capture MySQL Changes Using Binary Log Parsing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL binary logging (`log_bin`, `binlog_format`, `binlog_row_image`)
- `mysqlbinlog` CLI utility
- `mysql-replication` Python library (pymysqlreplication)
- MySQL replication protocol
- Change Data Capture (CDC) concepts

## Sources Consulted
- MySQL 8.0 Reference Manual — Binary Log: https://dev.mysql.com/doc/refman/8.0/en/binary-log.html
- MySQL 8.0 Reference Manual — mysqlbinlog utility: https://dev.mysql.com/doc/refman/8.0/en/mysqlbinlog.html
- MySQL 8.0 Reference Manual — SHOW BINARY LOGS: https://dev.mysql.com/doc/refman/8.0/en/show-binary-logs.html
- MySQL 8.0 Reference Manual — binlog_row_image: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_row_image
- python-mysql-replication GitHub repository and documentation: https://github.com/julien-duponchelle/python-mysql-replication

## Issues Found
1. **Incorrect binary log position tracking code** (lines 153-155): Both `log_file` and `log_pos` were assigned the same value `binlogevent.packet.log_pos`, which is an integer position. The `log_file` variable should contain the binary log filename (a string like `mysql-bin.000003`), not a duplicate of the numeric position. Fixed by changing the code to use `stream.log_file` and `stream.log_pos`, which are the correct attributes on the `BinLogStreamReader` object for retrieving the current log file name and position.

## Review Notes
- The `binlog_row_image = MINIMAL` description is a simplification. With `MINIMAL`, the before-image includes only columns needed to identify the row (e.g., primary key), and the after-image includes only columns that were actually changed. The post says "only the changed columns are recorded," which is close enough for a tutorial-level explanation.
- The `Encrypted` column in the `SHOW BINARY LOGS` output was added in MySQL 8.0.14. Users on older versions will see only `Log_name` and `File_size`.
- The `--password=secret` flag in the remote `mysqlbinlog` example passes the password on the command line, which MySQL warns about. In production, `--password` without a value (prompts interactively) or a login path file is recommended.
- The Python example uses `passwd` in the connection settings dict, which is a valid alias in PyMySQL (the underlying driver) but `password` is the more common and documented key name.
