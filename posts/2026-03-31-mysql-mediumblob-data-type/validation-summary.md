# Validation Summary: How to Use MEDIUMBLOB Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (MEDIUMBLOB data type, BLOB family, generated columns, max_allowed_packet)
- Python (mysql-connector-python library)
- SQL (DDL, DML, system variables)

## Sources Consulted
- MySQL 8.0 Reference Manual: The BLOB and TEXT Types — https://dev.mysql.com/doc/refman/8.0/en/blob.html
- MySQL 8.0 Reference Manual: Data Type Storage Requirements — https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Reference Manual: Limits on Table Column Count and Row Size — https://dev.mysql.com/doc/refman/8.0/en/column-count-limit.html
- MySQL 8.0 Reference Manual: Server System Variables (max_allowed_packet) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_allowed_packet
- MySQL 8.0 Reference Manual: mysql Client Options (--max-allowed-packet) — https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html#option_mysql_max_allowed_packet
- MySQL 8.0 Reference Manual: CREATE TABLE and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- mysql-connector-python documentation — https://dev.mysql.com/doc/connector-python/en/

## Issues Found

1. **Inaccurate row-size claim**: The post stated MEDIUMBLOB "does not contribute to the 65,535-byte per-row limit." This is incorrect — BLOB columns contribute 9 to 12 bytes toward the row size limit (for the length prefix and pointer to the off-page data). Fixed to state this accurately and also noted that off-page storage applies with the default DYNAMIC row format.

2. **Misleading "streaming" description**: The intro to the streaming section claimed fetching data "in chunks from your application to avoid loading everything into memory at once," but the code uses `fetchone()` which loads the entire blob into memory. The chunked writing to disk does not reduce memory usage. Fixed the description to accurately reflect what the code does.

3. **Incorrect bash comment**: The comment said "set at session level before a large insert" for the `mysql --max_allowed_packet=20M` command. The `--max_allowed_packet` flag is a client-side option that sets the client's communication buffer size, not a server session variable. Fixed the comment to say "set the client-side max packet size."

## Review Notes
- The generated column `file_size INT UNSIGNED GENERATED ALWAYS AS (LENGTH(file_data)) STORED` is valid but requires MySQL 5.7.6+ with InnoDB. Older versions or other storage engines may not support stored generated columns referencing BLOB columns.
- The server's `max_allowed_packet` must also be set large enough independently of the client setting. The post covers the server-side config (my.cnf) but could more explicitly distinguish between server and client settings.
- The "Streaming Large Values" code is functionally correct but does not actually reduce peak memory usage. For true streaming of large BLOBs, one would need to use MySQL's streaming result set features or chunked transfer at the protocol level, which mysql-connector-python does not natively support in a straightforward way.
