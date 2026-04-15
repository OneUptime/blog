# Validation Summary: How to Use simpleJSONExtractInt() and simpleJSONExtractFloat() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- JSON parsing functions (simpleJSONExtractInt, simpleJSONExtractFloat)

## Sources Consulted
- ClickHouse official documentation — JSON functions: https://clickhouse.com/docs/en/sql-reference/functions/json-functions

## Issues Found
1. **Incorrect claim about nesting behavior**: The post originally stated that `simpleJSON*` functions "support only flat (non-nested) key lookups" and that "the key must be a direct field of the top-level object." This is incorrect. According to the official ClickHouse documentation, fields are searched for on **any nesting level, indiscriminately**, and the first occurrence is used. Fixed the bullet points under "How simpleJSON Functions Work" to accurately describe this behavior.
2. **Misleading intro phrasing**: The introductory paragraph described the `simpleJSON*` family as "optimized for simple, flat JSON objects," which reinforced the incorrect nesting claim. Changed to "optimized for fast extraction from JSON strings."

## Review Notes
- All code examples are syntactically correct and produce the expected output values (verified arithmetic for aggregation examples).
- The function signatures (two arguments: JSON string and field name) are correct per documentation.
- The return-value-of-0 behavior for missing keys is correct per documentation.
- The `visitParamExtractInt` and `visitParamExtractFloat` functions are aliases for the `simpleJSON` variants (not deprecated predecessors), though the post does not mention aliases, which is fine.
- The SQL in the "Complete Working Example" (CREATE TABLE, INSERT, SELECT with GROUP BY) is valid ClickHouse SQL.
