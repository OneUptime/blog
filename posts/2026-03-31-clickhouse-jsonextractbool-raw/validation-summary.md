# Validation Summary: How to Use JSONExtractBool() and JSONExtractRaw() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- JSON functions (`JSONExtractBool`, `JSONExtractRaw`, `JSONExtractString`, `JSONExtractInt`)
- Mermaid diagrams

## Sources Consulted
- Official ClickHouse JSON functions documentation: https://clickhouse.com/docs/sql-reference/functions/json-functions
- ClickHouse data types reference for `UInt8` / `Bool`

## Issues Found
No technical issues found.

Verified:
- `JSONExtractBool(json, path...)` returns `1` for `true`, `0` for `false`, and `0` for missing keys or non-boolean values. Return type is `Bool` (represented as `UInt8`), matching the post's claim.
- `JSONExtractRaw(json, path...)` returns the unparsed JSON fragment as `String`, including container brackets for objects and arrays, matching the post's description.
- Syntax declarations for both functions are correct (variadic path element arguments).
- The chaining pattern `JSONExtractInt(JSONExtractRaw(doc, 'order'), 'id')` is valid — JSONExtractRaw returns a JSON string that can be re-parsed by other JSON extraction functions.
- All SQL examples (subqueries with UNION ALL, MergeTree CREATE TABLE with ORDER BY, INSERT VALUES, and SELECT queries) are syntactically valid ClickHouse SQL.
- Expected output values for all examples are consistent with the semantics of these functions.

## Review Notes
- The post uses the chained `JSONExtractRaw(...)` + `JSONExtractBool(...)` pattern for illustrative purposes in the A/B testing example. In practice, users can pass multiple path elements directly (e.g., `JSONExtractBool(payload, 'flags', 'new_ui')`), which is more efficient because it avoids re-parsing the intermediate JSON string. This is a pedagogical choice, not a technical error.
- The claim that `JSONExtractBool` returns `0` for "not boolean" values is consistent with the official docs' "Returns a Bool value if it exists, otherwise returns 0." Note that behavior for numeric `0`/`1` JSON values is not explicitly demonstrated; most users won't encounter this edge case.
- No version-specific caveats; these functions have been stable in ClickHouse for a long time.
