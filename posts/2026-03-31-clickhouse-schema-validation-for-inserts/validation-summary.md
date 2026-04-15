# Validation Summary: How to Implement Schema Validation for ClickHouse Inserts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, CHECK constraints, input format settings)
- Python (application-layer validation)
- JSONEachRow and JSON input formats

## Sources Consulted
- ClickHouse CREATE TABLE documentation (CHECK constraints): https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse ALTER CONSTRAINT documentation: https://clickhouse.com/docs/sql-reference/statements/alter/constraint
- ClickHouse Format Settings documentation: https://clickhouse.com/docs/operations/settings/formats
- ClickHouse JSONEachRow format documentation: https://clickhouse.com/docs/interfaces/formats/JSONEachRow
- ClickHouse JSON format documentation (metadata-based formats): https://clickhouse.com/docs/interfaces/formats/JSON
- ClickHouse LowCardinality type documentation: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse ALTER COLUMN documentation: https://clickhouse.com/docs/sql-reference/statements/alter/column

## Issues Found
1. **`input_format_json_validate_types_from_metadata` misleading in context**: This setting applies to JSON formats that include a metadata block (JSON, JSONCompact, JSONColumnsWithMetadata), not to JSONEachRow which is referenced in the post's introduction. Added a clarifying note to the setting description.
2. **Summary said "all three" instead of "all four"**: The post describes four layers (table constraints, input format settings, application validation, dead letter queue) but the summary incorrectly said "Layer all three together." Changed to "all four."
3. **Unused `import json` in Python example**: The `import json` statement was never used in the code snippet. Removed it.

## Review Notes
- CHECK constraints are not enforced during background merges or ALTER UPDATE operations. The post does not mention this limitation, which could be relevant for users relying solely on constraints for data quality.
- The default for `input_format_skip_unknown_fields` is 1 (skip/ignore) in modern ClickHouse versions, so the advice to set it to 0 is correct and useful.
- The default for `input_format_null_as_default` is 1 (enabled), meaning NULLs are silently converted to column defaults. Setting it to 0 as the post suggests will correctly cause exceptions for NULL values in non-Nullable columns.
- All SQL syntax (CREATE TABLE with constraints, ALTER TABLE ADD COLUMN, MergeTree engine, LowCardinality type) is correct and current.
