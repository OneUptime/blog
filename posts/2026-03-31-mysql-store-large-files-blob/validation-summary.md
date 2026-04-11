# Validation Summary: How to Store Large Files in MySQL Using BLOB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (BLOB data types, LOAD_FILE(), INTO DUMPFILE, max_allowed_packet)
- Python (mysql.connector / MySQL Connector/Python)
- SQL (DDL and DML)

## Sources Consulted
- MySQL 8.0 Reference Manual — String Data Types (BLOB): https://dev.mysql.com/doc/refman/8.0/en/blob.html
- MySQL 8.0 Reference Manual — LOAD_FILE(): https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_load-file
- MySQL 8.0 Reference Manual — SELECT ... INTO DUMPFILE: https://dev.mysql.com/doc/refman/8.0/en/select-into.html
- MySQL 8.0 Reference Manual — max_allowed_packet: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_allowed_packet
- MySQL 8.0 Reference Manual — secure_file_priv: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_secure_file_priv
- MySQL Connector/Python Developer Guide: https://dev.mysql.com/doc/connector-python/en/

## Issues Found
No technical issues found.

## Review Notes
- The BLOB size limits are all precisely correct (TINYBLOB: 2^8-1, BLOB: 2^16-1, MEDIUMBLOB: 2^24-1, LONGBLOB: 2^32-1).
- The Python example does not explicitly close the cursor or connection. This is common in tutorial snippets but production code should use context managers or explicit cleanup.
- `LOAD_FILE()` returns NULL if the file cannot be read (wrong permissions, outside `secure_file_priv`, or larger than `max_allowed_packet`). Since the `file_data` column is `NOT NULL`, this would cause an insert error rather than silently storing NULL — which is actually a safe design choice.
- `INTO DUMPFILE` also requires `FILE` privilege and is subject to `secure_file_priv`, similar to `LOAD_FILE()`. The post mentions these constraints for `LOAD_FILE()` but not for `DUMPFILE`. This is a minor documentation gap, not an error.
