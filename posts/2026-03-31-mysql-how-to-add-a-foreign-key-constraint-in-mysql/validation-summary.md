# Validation Summary: How to Add a Foreign Key Constraint in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL DDL (ALTER TABLE, CREATE TABLE)
- Foreign key constraints and referential integrity
- INFORMATION_SCHEMA views

## Sources Consulted
- MySQL 8.0 Reference Manual — FOREIGN KEY Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — ALTER TABLE: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA KEY_COLUMN_USAGE Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html

## Issues Found

1. **SET DEFAULT listed as a valid referential action**: The post listed `SET DEFAULT` alongside other referential actions as if it were usable. While the MySQL parser recognizes `SET DEFAULT`, InnoDB (and NDB) reject table definitions containing `ON DELETE SET DEFAULT` or `ON UPDATE SET DEFAULT`. Removed it from the action list and added a note explaining that it is not usable with InnoDB tables.

2. **NO ACTION described as "checked at end of statement"**: The post stated `NO ACTION` is "same as RESTRICT (checked at end of statement)." In standard SQL, NO ACTION is deferred to statement end, but in MySQL/InnoDB, NO ACTION and RESTRICT are fully equivalent — both check immediately and reject the operation right away. Corrected the description to accurately reflect MySQL behavior.

## Review Notes
- The requirement that "the referenced column must be indexed (primary key or unique key)" is a slight simplification. InnoDB technically allows foreign keys to reference any indexed column, not just primary or unique keys. However, referencing primary/unique keys is the standard recommendation and what the MySQL documentation emphasizes, so this is an acceptable simplification for a tutorial.
- All SQL syntax examples are correct and follow standard MySQL conventions.
- The INFORMATION_SCHEMA query for checking foreign keys is correct.
- The DROP FOREIGN KEY and DROP INDEX combined syntax is accurate.
- The FOREIGN_KEY_CHECKS variable usage is correct.
