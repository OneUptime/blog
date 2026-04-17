# Validation Summary: How to Use Dynamic Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Dynamic data type, introduced experimentally in 24.5)
- SQL (ClickHouse dialect)
- MergeTree engine
- `dynamicType()` function and subcolumn accessor syntax

## Sources Consulted
- ClickHouse Dynamic type reference: https://clickhouse.com/docs/sql-reference/data-types/dynamic
- ClickHouse type-conversion functions: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- Implementation PR (merged 2024-05-23, backported to 24.5): https://github.com/ClickHouse/ClickHouse/pull/63058
- ClickHouse 24.8 LTS release notes: https://clickhouse.com/blog/clickhouse-release-24-08

## Issues Found
- **Integer literal type inference was wrong.** The post claimed `42` inserted into a Dynamic column would be stored as `UInt8`. Per the official Dynamic docs, plain integer literals are inferred as `Int64`; `UInt8` only appears when explicitly cast (e.g. `42::UInt8`).
  - Fixed the example output table so row 1 shows `Int64` instead of `UInt8`.
  - Fixed the "Accessing Typed Variants" example that used `attr_value.UInt8` — replaced with `attr_value.Int64` (and renamed the alias to `int64_value`) so the subcolumn access actually matches the stored variant.

## Review Notes
- The `allow_experimental_dynamic_type = 1` setting name is correct.
- `dynamicType()` returning a `String` with the variant type name is correct (returns `'None'` for NULL).
- Subcolumn access syntax `column.TypeName` is documented and correct; compound type names would need backtick-quoting (e.g. `` attr_value.`Array(String)` ``), which is not exercised in the post but worth remembering.
- The `CAST(value, 'Type')` function form is valid alongside `CAST(value AS Type)` and `value::Type`.
- The "Dynamic columns cannot be used in `ORDER BY` keys" claim is accurate for default settings — technically it can be force-enabled via `allow_suspicious_types_in_order_by=1`, but the default behavior (which the post describes) forbids it. Left as-is since the statement is correct for defaults.
- The Bool inference for the literal `true` is correct per the official docs.
- The CAST in the EAV example (`CAST(p.prop_value, 'UInt8')` for a Bool-stored `in_stock`) is fine because Bool casts to UInt8 cleanly in ClickHouse.
- Version caveat for future readers: Dynamic was introduced experimentally in 24.5 and became prominent as the backing type for the new JSON column in 24.8 LTS. The "experimental in some versions" language in the post remains accurate at the time of review.
