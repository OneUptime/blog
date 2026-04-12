# Validation Summary: How to Use CHECK Constraints in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.16+
- CHECK constraints (DDL)
- INFORMATION_SCHEMA views (TABLE_CONSTRAINTS, CHECK_CONSTRAINTS)
- ALTER TABLE operations
- LOAD DATA INFILE

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE: CHECK Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual — ALTER TABLE: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA CHECK_CONSTRAINTS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-check-constraints-table.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA TABLE_CONSTRAINTS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-constraints-table.html

## Issues Found
1. **Incorrect claim that MySQL 8 cannot disable CHECK constraints.** The "Disabling a CHECK Constraint" section stated "MySQL 8 does not support disabling individual constraints" and only showed dropping the constraint. In fact, MySQL 8.0.16+ supports `ALTER TABLE ... ALTER CHECK ... NOT ENFORCED` and `ALTER TABLE ... ALTER CHECK ... ENFORCED` to toggle enforcement without dropping the constraint. Fixed the section to show the correct ALTER CHECK syntax, while still mentioning DROP CONSTRAINT as an option.

2. **Bulk load section used drop/re-add instead of toggling enforcement.** The "Re-adding a Constraint After Bulk Load" section recommended dropping and re-adding the constraint for bulk loads. Updated to use the simpler `ALTER CHECK ... NOT ENFORCED` / `ENFORCED` pattern. Added a note clarifying that re-enabling with ENFORCED does not retroactively validate existing rows — if full validation is needed, dropping and re-adding the constraint is necessary since only ADD CONSTRAINT validates all existing rows.

## Review Notes
- The post uses `DROP CONSTRAINT` syntax which was added in MySQL 8.0.19. Users on 8.0.16–8.0.18 would need to use `DROP CHECK constraint_name` instead. This is a minor compatibility note but not incorrect since the vast majority of MySQL 8 installations are 8.0.19+.
- All SQL syntax, error codes (3819/HY000), INFORMATION_SCHEMA column names, and ENUM/DECIMAL types are correct.
- The NOT ENFORCED option is correctly described and demonstrated.
- The multi-column constraint examples are valid and the error behavior is accurately described.
