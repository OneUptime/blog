# Validation Summary: How to Use simpleJSONExtractRaw() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- simpleJSONExtractRaw() function
- JSONExtractRaw() function
- ClickHouse JSON heuristic (simpleJSON) function family

## Sources Consulted
- ClickHouse official documentation — JSON functions: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse GitHub source — JSON functions reference: https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/functions/json-functions.md
- Altinity Knowledge Base — JSONExtract usage patterns: https://kb.altinity.com/altinity-kb-queries-and-syntax/jsonextract-to-parse-many-attributes-at-a-time/

## Issues Found
No technical issues found.

## Review Notes
- The function `simpleJSONExtractRaw` performs **case-insensitive** key matching, unlike the standard `JSONExtractRaw` which is case-sensitive. The blog post does not mention this distinction. While not an error, it could be a useful addition in a future update to help readers avoid surprises when keys differ only in casing.
- The function also has a legacy alias `visitParamExtractRaw`. The blog does not mention this, which is fine for clarity but worth noting for completeness.
- All code examples use correct syntax, correct argument counts (two arguments: JSON string and field name), and correctly demonstrate the quoted-string return behavior for string values.
- The comparison with `'"error"'` in the WHERE clause correctly accounts for the surrounding quotes in the raw return value — a common source of user confusion that the post handles well.
