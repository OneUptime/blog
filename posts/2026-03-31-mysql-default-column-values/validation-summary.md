# Validation Summary: How to Use DEFAULT Values for Columns in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (general DEFAULT column syntax)
- MySQL 8.0.13+ (expression defaults)
- INFORMATION_SCHEMA
- ALTER TABLE DDL operations

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — Data Type Default Values: https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual — ALTER TABLE: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA COLUMNS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html

## Issues Found

### 1. Incorrect claim that TEXT/BLOB columns cannot have non-NULL defaults
- **What was wrong:** The section "TEXT and BLOB Columns Have No Default" stated that TEXT and BLOB types "cannot have a non-NULL default." This is incorrect for MySQL 8.0.13+, which the post itself covers in an earlier section. Since MySQL 8.0.13, TEXT and BLOB columns CAN have non-NULL defaults using expression syntax (e.g., `DEFAULT ('placeholder')`). Only literal defaults (without parentheses) are disallowed.
- **What was changed:** Updated the section title to "TEXT and BLOB Column Defaults", corrected the explanation to say they cannot have literal (non-expression) defaults, replaced the VARCHAR workaround example with the correct expression default syntax `DEFAULT ('placeholder')`, and updated the summary paragraph to accurately reflect the expression syntax requirement.
- **Why:** The MySQL 8.0 documentation explicitly states: "The BLOB, TEXT, GEOMETRY, and JSON data types can be assigned a default value only if the value is written as an expression, even if the expression value is a literal value."

## Review Notes
- All other SQL syntax (CREATE TABLE, ALTER TABLE, INSERT, SHOW COLUMNS, INFORMATION_SCHEMA queries) is correct.
- The expression defaults version (8.0.13+) is accurately cited.
- The distinction between `ALTER TABLE ... MODIFY COLUMN` (table rebuild) and `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT` (metadata-only, fast ALTER) is correct.
- The `CURRENT_TIMESTAMP` default usage for both DATETIME and TIMESTAMP columns is correct.
- The DEFAULT keyword usage in INSERT statements is correct.
