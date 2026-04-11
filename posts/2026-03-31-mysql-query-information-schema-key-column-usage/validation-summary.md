# Validation Summary: How to Query INFORMATION_SCHEMA.KEY_COLUMN_USAGE in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA.KEY_COLUMN_USAGE
- INFORMATION_SCHEMA.TABLE_CONSTRAINTS
- INFORMATION_SCHEMA.STATISTICS
- SQL (GROUP_CONCAT, CONCAT, JOIN, LEFT JOIN)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA KEY_COLUMN_USAGE Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLE_CONSTRAINTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-constraints-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: InnoDB and FOREIGN KEY Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html

## Issues Found
No technical issues found.

## Review Notes
- The "Finding FK Columns Not Indexed on the Child Side" query is logically correct, but in practice InnoDB automatically creates an index on foreign key columns if one does not already exist. This means the query will typically return no results for InnoDB tables unless indexes were manually dropped (which InnoDB prevents if the index is required by a FK). The query is still valid as a verification tool, but readers should be aware of this InnoDB behavior.
- The LEFT JOIN with STATISTICS checks whether the FK column appears in any index position. For optimal FK performance, the column should ideally be a leftmost prefix of an index. The query does not distinguish index column position, which is a minor nuance but not an error.
- All column names, table names, SQL syntax, and filtering logic are correct per the MySQL 8.0 documentation.
- The join between TABLE_CONSTRAINTS and KEY_COLUMN_USAGE correctly uses the three-column composite join (CONSTRAINT_NAME, TABLE_SCHEMA, TABLE_NAME) to avoid false matches across schemas or tables.
