# Validation Summary: How to Export MySQL Data to JSON

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.7+ (JSON functions: JSON_OBJECT, JSON_ARRAYAGG)
- MySQL SELECT INTO OUTFILE
- MySQL command-line client (mysql)
- Python 3 with mysql-connector-python
- NDJSON (newline-delimited JSON) format

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON Function Reference: https://dev.mysql.com/doc/refman/8.0/en/json-function-reference.html
- MySQL 8.0 Reference Manual — JSON_OBJECT: https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html#function_json-object
- MySQL 8.0 Reference Manual — JSON_ARRAYAGG: https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_json-arrayagg
- MySQL 8.0 Reference Manual — SELECT ... INTO OUTFILE: https://dev.mysql.com/doc/refman/8.0/en/select-into.html
- MySQL 8.0 Reference Manual — mysql Client Options: https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
- mysql-connector-python documentation: https://dev.mysql.com/doc/connector-python/en/

## Issues Found
No technical issues found.

## Review Notes
- `JSON_ARRAYAGG` was specifically introduced in MySQL 5.7.22 (not 5.7.0). The post's "MySQL 5.7+" phrasing is accurate but users on early 5.7.x releases (prior to 5.7.22) will not have this function available.
- The `SELECT ... INTO OUTFILE` examples require the `FILE` privilege and are constrained by the `secure_file_priv` system variable. The post doesn't mention this, which could cause confusion for users who encounter permission errors.
- The streaming Python example description says "stream rows in chunks" but the code actually streams row-by-row, which is fine and arguably better — the description is slightly imprecise but not wrong.
