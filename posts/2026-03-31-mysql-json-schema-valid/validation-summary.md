# Validation Summary: How to Use JSON_SCHEMA_VALID() in MySQL 8.0+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.17+
- JSON Schema (Draft 4 subset)
- SQL (DDL with CHECK constraints, DML, SELECT queries)

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON Schema Validation Functions: https://dev.mysql.com/doc/refman/8.0/en/json-validation-functions.html
- MySQL Worklog WL#11999 (JSON Schema validation implementation)
- JSON Schema Draft 4 specification

## Issues Found
No technical issues found.

All code examples are syntactically correct and produce the expected results:
- `JSON_SCHEMA_VALID()` syntax and return values (1, 0, NULL) are accurate.
- The function was correctly identified as introduced in MySQL 8.0.17.
- The CHECK constraint example correctly uses an inline JSON literal string (required for CHECK constraints — variables cannot be used).
- Error 3819 (ER_CHECK_CONSTRAINT_VIOLATED) is the correct error code.
- Enum, pattern, NULL handling, and filtering examples are all correct.
- The supported keywords table lists only valid, supported keywords.

## Review Notes
- The supported keywords table is a curated subset, not an exhaustive list. Additional supported keywords not mentioned include: `additionalProperties`, `patternProperties`, `allOf`, `anyOf`, `oneOf`, `not`, `exclusiveMinimum`, `exclusiveMaximum`, `minProperties`, `maxProperties`, `multipleOf`, `dependencies`, and `additionalItems`. The blog does not claim the table is exhaustive, so this is an editorial choice rather than an error.
- MySQL silently ignores invalid regex patterns in the `pattern` keyword (the document validates as if the pattern constraint did not exist). This is a known gotcha not mentioned in the post.
- The `$ref` keyword is not supported (raises ER_NOT_SUPPORTED_YET). Not mentioned but relevant for users coming from full JSON Schema implementations.
- The `format` keyword is recognized but not enforced (silently ignored). Not mentioned in the post.
- Starting from MySQL 8.0.19, `SHOW WARNINGS` after a CHECK constraint violation (error 3819) provides detailed diagnostic information including the exact failed keyword and schema/document location. This could be a useful addition for debugging guidance.
