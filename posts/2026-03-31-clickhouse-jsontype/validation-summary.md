# Validation Summary: How to Use JSONType() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- ClickHouse JSON functions (`JSONType`, `JSONHas`, `JSONExtractFloat`, `JSONExtractArrayRaw`, `JSONExtractKeys`)

## Sources Consulted
- ClickHouse JSON Functions documentation: https://clickhouse.com/docs/sql-reference/functions/json-functions
- ClickHouse source code (`FunctionsJSON.cpp`, `JSONTypeImpl`): https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/FunctionsJSON.cpp
- ClickHouse `JSONExtractKeys` PR/docs: https://github.com/ClickHouse/ClickHouse/pull/30056

## Issues Found

1. **Incorrect return value for floating-point numbers (`Float64` → `Double`).** `JSONType` returns the enum string `'Double'` for floating-point JSON values, not `'Float64'`. The source code defines the enum as `{"Array", "Object", "String", "Int64", "UInt64", "Double", "Bool", "Null"}`. Fixed in three places: the intro paragraph, the `Checking Types Before Extraction` SQL example (`IN (...)` list), and the summary.

2. **Wrong claim about distinguishing missing keys from `null`.** The post claimed an empty string is returned when a key is absent and `'Null'` only when the value is JSON `null`. In current ClickHouse, `JSONType` returns an `Enum8` whose default (used when the path cannot be resolved) is `'Null'` — the same value returned for an explicit JSON `null`. The two cases are indistinguishable using `JSONType` alone. Updated the intro, the `Detecting Missing vs Null` section (now uses `JSONHas` to distinguish the cases), and the summary to reflect this.

3. **`JSONExtractKeysAndValues(payload, String)` does not enumerate all top-level keys.** That call only returns key/value pairs whose values are convertible to `String`, so the "schema summary" example would silently miss keys with non-string values (objects, arrays, numerics). Replaced with `JSONExtractKeys(payload)`, which returns every top-level key as `Array(String)` regardless of value type.

## Review Notes
- The basic example output table (Int64, String, Array, Object) is correct as written.
- `JSONType` accepts a variadic path of keys/indices, so the nested `JSONType(profile, 'address', 'zip')` example is valid.
- Worth knowing for readers: because `JSONType` returns an `Enum8`, comparing it against an unknown string literal (e.g., a typo) will raise an "Unknown element" error rather than returning `false`.
