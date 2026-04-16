# Validation Summary: How to Use JSONExtractArrayRaw() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- SQL
- JSON processing functions (`JSONExtractArrayRaw`, `JSONExtractString`, `JSONExtractInt`, `JSONExtractFloat`)
- Array functions (`arrayJoin`, `arrayAll`, `length`)

## Sources Consulted
- [ClickHouse JSON Functions documentation](https://clickhouse.com/docs/sql-reference/functions/json-functions)

## Issues Found
- **Incorrect function reference in Summary section**: The post referred to `JSONExtractArrayOfStrings` as a "typed alternative" to `JSONExtractArrayRaw`. This function does not exist in ClickHouse. Replaced with the correct typed alternative `JSONExtract(json, 'Array(String)')`, which is the generic `JSONExtract` used with an `Array(String)` type template and is the actual typed counterpart that cannot handle heterogeneous or object-valued arrays.

All other technical content was verified as correct:
- Signature and return type `Array(String)` for `JSONExtractArrayRaw` are accurate.
- Second-argument (and further) navigation via field names/indices is supported per the official docs.
- Output format showing raw JSON fragments (quoted strings, unquoted numbers/booleans, raw object JSON) matches ClickHouse behavior.
- `arrayJoin`, `length`, and `arrayAll` usage patterns with lambdas are syntactically correct ClickHouse SQL.
- Subquery patterns for exploding JSON arrays and then parsing fields with `JSONExtractString`/`JSONExtractFloat`/`JSONExtractInt` are valid.

## Review Notes
- The generic `JSONExtract(json, indices_or_keys..., 'Type')` is the typed counterpart referenced in the corrected summary; readers wanting strongly typed arrays can use e.g. `JSONExtract(payload, 'ids', 'Array(UInt64)')`.
- ClickHouse also provides case-insensitive variants (e.g., `JSONExtractArrayRawCaseInsensitive`) that could be mentioned for completeness, but this is optional — not an error.
- The newer `JSON` column type and the experimental `Object('json')` type offer alternative approaches for JSON data in ClickHouse but are outside the scope of this post.
