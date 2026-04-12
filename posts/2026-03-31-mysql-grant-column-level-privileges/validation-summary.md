# Validation Summary: How to Grant Column-Level Privileges in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (GRANT/REVOKE statements, column-level privileges)
- information_schema.COLUMN_PRIVILEGES system table

## Sources Consulted
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: REVOKE Statement — https://dev.mysql.com/doc/refman/8.0/en/revoke.html
- MySQL 8.0 Reference Manual: SHOW GRANTS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.0 Reference Manual: COLUMN_PRIVILEGES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-column-privileges-table.html

## Issues Found
- **Incorrect REVOKE comment**: The comment on the `REVOKE SELECT (salary)` example stated that revoking a never-granted column privilege "is a no-op or raises a warning." This is incorrect — MySQL raises an error (ERROR 1147: "There is no such grant defined for user...") when attempting to revoke a column privilege that was never granted. Updated the comment to reflect this.

## Review Notes
- The four privilege types that support column-level grants (SELECT, INSERT, UPDATE, REFERENCES) are correctly listed.
- All SQL syntax examples are correct and would work as described.
- The error code 1143 (SQLSTATE 42000) shown for unauthorized column access is accurate.
- The information_schema.COLUMN_PRIVILEGES query uses the correct column names.
- The SHOW GRANTS output format is a reasonable representation of MySQL 8.0+ output.
- The advice about using views as an alternative to column-level privileges is sound practical guidance.
