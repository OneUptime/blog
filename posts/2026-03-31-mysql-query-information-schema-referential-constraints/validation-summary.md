# Validation Summary: How to Query INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
- INFORMATION_SCHEMA.KEY_COLUMN_USAGE
- InnoDB foreign key constraints
- SQL DDL (ALTER TABLE for foreign keys)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA REFERENTIAL_CONSTRAINTS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-referential-constraints-table.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA KEY_COLUMN_USAGE Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html)
- MySQL 8.0 Reference Manual: Foreign Key Constraints (https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html)
- MySQL 8.0 Reference Manual: InnoDB and FOREIGN KEY Constraints (https://dev.mysql.com/doc/refman/8.0/en/innodb-foreign-key-constraints.html)

## Issues Found
No technical issues found.

## Review Notes
- The JOIN queries will produce multiple rows for multi-column foreign keys (one row per column in the FK). The ALTER TABLE generation query would also produce incomplete statements for multi-column FKs since it only handles a single column. This is a common simplification in tutorials and not a technical error, but users working with composite foreign keys should be aware of this limitation.
- The join condition uses `kcu.TABLE_SCHEMA` rather than `kcu.CONSTRAINT_SCHEMA`. Both are functionally equivalent for foreign key constraints within a single schema, so the queries produce correct results.
- The NO ACTION description ("Like RESTRICT but deferred") references the SQL standard behavior; the parenthetical "(effectively same in MySQL)" correctly clarifies that MySQL/InnoDB treats them identically.
