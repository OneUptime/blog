# Validation Summary: How to Query INFORMATION_SCHEMA.TABLE_PRIVILEGES in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA.TABLE_PRIVILEGES
- MySQL privilege system (GRANT/REVOKE)
- INFORMATION_SCHEMA.SCHEMA_PRIVILEGES (comparison)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLE_PRIVILEGES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-privileges-table.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMN_PRIVILEGES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-column-privileges-table.html)
- MySQL 8.0 Reference Manual: GRANT Statement (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- MySQL 8.0 Reference Manual: REVOKE Statement (https://dev.mysql.com/doc/refman/8.0/en/revoke.html)

## Issues Found
- **Inaccurate granularity claim**: The post stated TABLE_PRIVILEGES is "the most granular of the privilege views." This is incorrect because `INFORMATION_SCHEMA.COLUMN_PRIVILEGES` provides column-level privilege information, which is more granular. Removed the inaccurate superlative claim.

## Review Notes
- All SQL queries are syntactically correct and use proper quoting conventions (e.g., the GRANTEE column stores values with embedded single quotes like `'user'@'host'`, so filtering requires double-quoted strings wrapping single-quoted values).
- The column list is complete and accurate per MySQL 8.0 documentation.
- The `DROP` privilege correctly appears as a filterable PRIVILEGE_TYPE for table-level grants.
- The distinction between TABLE_PRIVILEGES and SCHEMA_PRIVILEGES is accurately explained.
- The REVOKE statement generator produces valid MySQL syntax.
- The summary could mention `COLUMN_PRIVILEGES` alongside `USER_PRIVILEGES` and `SCHEMA_PRIVILEGES` for a more complete picture, but this is a minor enhancement rather than an error.
