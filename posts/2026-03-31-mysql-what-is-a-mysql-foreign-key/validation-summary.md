# Validation Summary: What Is a MySQL Foreign Key

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (DDL: CREATE TABLE, ALTER TABLE; DML: INSERT)
- Foreign key constraints and referential integrity
- information_schema system tables

## Sources Consulted
- MySQL 8.0 Reference Manual: FOREIGN KEY Constraints (https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html)
- MySQL 8.0 Reference Manual: information_schema KEY_COLUMN_USAGE table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html)
- MySQL 8.0 Reference Manual: Server System Variables — foreign_key_checks (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_foreign_key_checks)

## Issues Found
- **SET NULL description incomplete in actions table**: The table entry for `SET NULL` originally said "Set child column to NULL when parent is deleted," but SET NULL applies to both `ON DELETE` and `ON UPDATE` contexts. The other table entries (RESTRICT, CASCADE) correctly referenced both operations. Fixed to "Set child column to NULL when parent is deleted/updated" for consistency and accuracy.

## Review Notes
- The post omits `SET DEFAULT` from the referential actions table. While MySQL parser recognizes this syntax, InnoDB does not support it and rejects table definitions using it. Omitting it is reasonable since it is not usable in practice.
- The `SHOW STATUS LIKE 'Innodb_rows_inserted'` example in the "When to Skip Foreign Keys" section is valid syntax but only shows a row count — it does not directly measure foreign key overhead. The surrounding comment ("look at 'rows_affected' and timing") is vague but not technically incorrect.
- The claim that foreign key checks can add 5-15% overhead in write-heavy systems is presented with appropriate hedging ("can be") and is a reasonable rough estimate, though actual overhead varies significantly by workload.
- All SQL syntax is correct and uses current, non-deprecated MySQL features.
- The InnoDB engine requirement is correctly shown in all CREATE TABLE examples.
- The error code 1452 for foreign key constraint violations is correct.
- The explanation that NO ACTION is equivalent to RESTRICT in MySQL is accurate — MySQL checks constraints immediately rather than deferring to end of statement.
