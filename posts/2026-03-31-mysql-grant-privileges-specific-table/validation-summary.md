# Validation Summary: How to Grant Privileges on a Specific Table in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (GRANT, REVOKE, SHOW GRANTS, information_schema)
- SQL privilege management
- MySQL user and access control system

## Sources Consulted
- MySQL 8.0 Reference Manual — GRANT Statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — REVOKE Statement: https://dev.mysql.com/doc/refman/8.0/en/revoke.html
- MySQL 8.0 Reference Manual — SHOW GRANTS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.0 Reference Manual — information_schema TABLE_PRIVILEGES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-privileges-table.html
- MySQL 8.0 Reference Manual — CREATE USER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-user.html

## Issues Found
- **Incorrect column-level grant syntax in comparison table**: The "Table-Level vs Database-Level Grants" table showed column-level grant syntax as `ON db.table (col1, col2)`, placing the column list in the ON clause. This is incorrect. In MySQL, column-level privileges specify columns after the privilege type, not in the ON clause. The correct syntax is `GRANT SELECT (col1, col2) ON db.table TO 'user'@'host'`. Fixed the table row to show `priv (col1, col2) ON db.table` to correctly indicate that the column specification is part of the privilege list.

## Review Notes
- All other SQL syntax (GRANT, REVOKE, SHOW GRANTS, CREATE USER) is correct and uses current MySQL 8.0 syntax.
- The SHOW GRANTS output format using backtick-quoted identifiers is accurate for MySQL 8.0+.
- The information_schema.TABLE_PRIVILEGES query uses correct column names.
- The error message format for denied access (ERROR 1142) is accurate.
- The subnet-based host specification (`10.0.0.0/255.255.255.0`) in the CREATE USER example is valid MySQL syntax.
- The claim that each table requires its own GRANT statement is correct — MySQL does not support wildcards for subsets of tables.
