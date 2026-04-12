# Validation Summary: How to Use Data Types in MySQL (INT, VARCHAR, TEXT, DATETIME, etc.)

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (data types, DDL, schema design)
- SQL (CREATE TABLE, INSERT, SELECT)

## Sources Consulted
- MySQL 8.0 Reference Manual — Data Types: https://dev.mysql.com/doc/refman/8.0/en/data-types.html
- MySQL 8.0 Reference Manual — Integer Types: https://dev.mysql.com/doc/refman/8.0/en/integer-types.html
- MySQL 8.0 Reference Manual — Fixed-Point Types: https://dev.mysql.com/doc/refman/8.0/en/fixed-point-types.html
- MySQL 8.0 Reference Manual — Date and Time Type Storage: https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html#data-types-storage-reqs-date-time
- MySQL 8.0 Reference Manual — String Type Storage: https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html#data-types-storage-reqs-strings
- MySQL 8.0 Reference Manual — The CHAR and VARCHAR Types: https://dev.mysql.com/doc/refman/8.0/en/char.html

## Issues Found
1. **DATETIME storage size incorrect (line 121)**: The post listed DATETIME as requiring 8 bytes of storage. This was true before MySQL 5.6.4 (released February 2013), but since MySQL 5.6.4 DATETIME uses 5 bytes (plus 0–3 additional bytes if fractional seconds are used). Since MySQL 5.5 reached end of life in 2018, virtually all current installations use the 5-byte format. Changed "8 bytes" to "5 bytes" in the Date and Time Types table.

## Review Notes
- The CHAR(n) storage description ("Always n bytes") is a simplification — for multi-byte character sets like utf8mb4, CHAR(n) can use up to n × 4 bytes. However, since the post primarily illustrates CHAR with ASCII examples (e.g., country codes), this is an acceptable simplification for the target audience.
- The TIMESTAMP upper range of 2038-01-19 refers to the Year 2038 problem (Unix epoch overflow). This is still accurate for MySQL 8.0, though future MySQL versions may address it.
- The VARCHAR(191) tip for utf8mb4 index prefix limits correctly notes this applies to "older MySQL versions" — MySQL 5.7+ defaults to innodb_large_prefix=ON with a 3072-byte limit, making VARCHAR(255) indexable.
- All SQL code examples are syntactically correct and would execute successfully on MySQL 5.7+/8.0.
