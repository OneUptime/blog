# Validation Summary: How to Use Variant and Dynamic Data Types in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse Variant data type
- ClickHouse Dynamic data type
- ClickHouse JSON functions (JSONExtractKeysAndValues)

## Sources Consulted
- ClickHouse Variant type documentation: https://clickhouse.com/docs/sql-reference/data-types/variant
- ClickHouse Dynamic type documentation: https://clickhouse.com/docs/sql-reference/data-types/dynamic
- ClickHouse JSON functions documentation: https://clickhouse.com/docs/sql-reference/functions/json-functions
- ClickHouse 25.3 release notes (Variant/Dynamic GA): https://clickhouse.com/blog/clickhouse-release-25-03

## Issues Found
- **Missing `allow_suspicious_variant_types` setting**: The original `CREATE TABLE events` example declared `Variant(UInt64, Float64, String, Array(String))`, which mixes similar numeric types (`UInt64` and `Float64`) in one Variant. ClickHouse considers this "suspicious" and requires `SET allow_suspicious_variant_types = 1` before the CREATE TABLE statement. Without it, the query would fail. Added the SET command with an explanatory comment before the CREATE TABLE.

## Review Notes
- The `Variant` type was introduced as experimental in ClickHouse 24.1 and `Dynamic` in 24.5. Both became production-ready in 25.3. Since this post is dated 2026-03-31, it correctly omits the older `allow_experimental_variant_type` / `allow_experimental_dynamic_type` settings that are no longer needed.
- The `variantType()` and `dynamicType()` functions are correctly used. `variantType()` returns an `Enum8`, while `dynamicType()` returns a `String`.
- Casting from Variant/Dynamic columns (e.g., `value::UInt64`) implicitly returns `Nullable(UInt64)` in ClickHouse. The blog doesn't claim otherwise, so this is fine, but readers should be aware the result type is Nullable.
- The JSON integration example using `JSONExtractKeysAndValues(..., 'Dynamic')` is correct and documented on the Dynamic type page.
