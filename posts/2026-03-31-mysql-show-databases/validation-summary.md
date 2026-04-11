# Validation Summary: How to Use SHOW DATABASES in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (SHOW DATABASES, SHOW SCHEMAS)
- information_schema views (SCHEMATA, TABLES)
- MySQL privilege system (SHOW DATABASES privilege, GRANT)
- Bash scripting (mysql CLI client usage)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW DATABASES Statement (https://dev.mysql.com/doc/refman/8.0/en/show-databases.html)
- MySQL 8.0 Reference Manual: GRANT Statement (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL (https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA SCHEMATA Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-schemata-table.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)

## Issues Found
No technical issues found.

## Review Notes
- The shell script example using `mysql -p"$PASS"` will produce a warning ("Using a password on the command line interface can be insecure") on stderr, which is expected behavior and does not affect correctness. This is a common pattern in examples and is acceptable.
- The `LIKE 'app_%'` pattern in the WHERE example uses `_` which is a single-character wildcard in MySQL LIKE patterns. This correctly matches databases starting with "app_" followed by at least one character, which appears to be the intended behavior.
- All information_schema column names (SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME, TABLE_SCHEMA, DATA_LENGTH, INDEX_LENGTH) are verified correct.
- The GRANT SHOW DATABASES syntax is correct as a global-level privilege (ON *.*).
