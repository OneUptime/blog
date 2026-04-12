# Validation Summary: How to Use JSON Schema Validation in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.17+
- JSON Schema (draft 4 subset as supported by MySQL)
- JSON_SCHEMA_VALID() function
- JSON_SCHEMA_VALIDATION_REPORT() function
- MySQL CHECK constraints

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON Schema Validation Functions (https://dev.mysql.com/doc/refman/8.0/en/json-validation-functions.html)
- MySQL 8.0 Reference Manual: CREATE TABLE and CHECK constraints (https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html)
- JSON Schema Specification Draft 4 (https://json-schema.org/specification-links#draft-4)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that `format` is recognized but not enforced by MySQL. The validation report example uses `"format": "email"` in the schema but the failure is due to the missing `age` field, not the invalid email format, which is consistent behavior.
- The supported keywords list includes `const`, which is technically a JSON Schema draft 6 keyword. However, MySQL's own documentation lists it as supported while referencing draft 4, so the post accurately reflects MySQL's actual behavior.
- The `exclusiveMinimum` and `exclusiveMaximum` keywords follow draft 4 semantics (boolean values) in MySQL, not draft 6+ semantics (numeric values). The post doesn't elaborate on this distinction, which is fine for an introductory tutorial.
- All SQL examples are syntactically correct and would produce the expected output on MySQL 8.0.17+.
