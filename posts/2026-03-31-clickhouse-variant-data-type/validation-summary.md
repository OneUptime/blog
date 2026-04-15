# Validation Summary: How to Use Variant Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- Variant data type (discriminated union type)
- Dynamic data type (mentioned for comparison)
- SQL (DDL, DML, aggregation queries)

## Sources Consulted
- ClickHouse Variant Type Documentation: https://clickhouse.com/docs/sql-reference/data-types/variant
- ClickHouse Dynamic Type Documentation: https://clickhouse.com/docs/en/sql-reference/data-types/dynamic
- ClickHouse Release 24.1 Blog (Variant introduction): https://clickhouse.com/blog/clickhouse-release-24-01
- ClickHouse Release Notes for 25.3 (GA status of Variant)

## Issues Found
1. **Incorrect version claim for GA availability**: The post stated "In ClickHouse 24.x and later, Variant is available without the experimental setting." This is incorrect — Variant remained experimental throughout the 24.x release cycle and required `allow_experimental_variant_type = 1`. It became generally available (no flag needed) in version 25.3. Fixed to: "In ClickHouse 25.3 and later, Variant is generally available without the experimental setting. For versions 24.x, you still need the flag."

## Review Notes
- The Variant vs Dynamic comparison table states "No" for sorting key use for both types. This is correct by default, but both types can technically be used in sorting keys by enabling `allow_suspicious_types_in_order_by = 1`. This is an advanced detail and the table is not misleading as-is, so no change was made.
- All SQL code examples are syntactically correct and use valid ClickHouse functions (`variantType()`, dot-accessor syntax, `avgIf`, `toInt64`, `toDate`, `toFloat64`).
- The polymorphic event schema example correctly uses explicit casts like `toInt64(5543)` and `toDate('2026-04-01')` to ensure proper type resolution when inserting into Variant columns.
- NULL handling behavior (`variantType()` returning `'None'`) is correctly described.
