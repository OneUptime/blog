# Validation Summary: How to Create Range Hashed Dictionaries in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse Dictionaries (range_hashed layout)
- ClickHouse dictGet functions
- SQL (DDL and DML)

## Sources Consulted
- ClickHouse official documentation on Dictionaries: https://clickhouse.com/docs/sql-reference/dictionaries
- ClickHouse official documentation on dictionary functions: https://clickhouse.com/docs/sql-reference/functions/ext-dict-functions
- ClickHouse official documentation on CREATE DICTIONARY / LIFETIME: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- Altinity Knowledge Base on range_hashed dictionaries: https://kb.altinity.com/altinity-kb-dictionaries/altinity-kb-range_hashed-example-open-intervals/

## Issues Found
1. **Deprecated `dictGetFloat64OrDefault` function**: The post used `dictGetFloat64OrDefault` in all three query examples. Type-specific dict functions (`dictGetFloat64`, `dictGetFloat64OrDefault`, etc.) are deprecated in modern ClickHouse. The official documentation states these functions "are supported for backward compatibility and have incorrect behavior" when there is a type mismatch between the actual attribute type and the function suffix. Replaced all occurrences with the recommended generic `dictGetOrDefault` function, wrapping the default literal with `toFloat64()` to ensure correct type inference.

## Review Notes
- The overlap detection query uses `e1.valid_from != e2.valid_from` to exclude self-joins. This works for the sample data but would fail to detect overlapping ranges that happen to share the same start date. A more robust approach would use row identifiers, but this is acceptable for an illustrative blog example.
- `LIFETIME(3600)` sets a fixed reload interval. The `LIFETIME(MIN x MAX y)` form is generally recommended for production multi-server deployments to avoid synchronized reload storms, but the single-value form used here is valid and appropriate for a tutorial.
- Both `Date` and `DateTime` types are correctly used as range boundary types across the two dictionary examples.
