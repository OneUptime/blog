# Validation Summary: How to Use JSONExtractKeys() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- ClickHouse JSON functions (`JSONExtractKeys`, `JSONExtractKeysAndValues`)
- ClickHouse array functions (`hasAll`, `has`, `arrayFilter`, `length`, `ARRAY JOIN`)

## Sources Consulted
- ClickHouse JSON functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse array functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/array-functions

## Issues Found
No technical issues found.

- The signature `JSONExtractKeys(json[, indices_or_keys, ...])` matches the official documentation, including the ability to pass additional string/integer arguments to navigate into nested objects.
- The return type `Array(String)` is correct.
- The basic example output `['env','region','version']` and the nested example output `['theme','lang','tz']` are consistent with how ClickHouse returns key arrays.
- The comparison with `JSONExtractKeysAndValues` is accurate: `JSONExtractKeys` returns only the key names.
- All supporting array functions (`hasAll`, `has`, `arrayFilter`, `length`, `ARRAY JOIN`, `count()`) are used with correct syntax and semantics.

## Review Notes
- The "Checking Whether a Required Key Set is Present" example filters with `WHERE hasAll(...) = 0` and also selects `has_required_fields` — for all returned rows that column will always be `0`. This is technically correct but somewhat redundant; a future revision could simplify by removing the redundant SELECT column or flipping the WHERE clause to surface compliant rows. Left unchanged as it is not a technical error.
- The post does not specify a ClickHouse version; `JSONExtractKeys` has been available in ClickHouse for many years and the documented behavior remains current as of 2026-04-16.
