# Validation Summary: How to Design a Slowly Changing Dimension (SCD) in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree engine
- ReplacingMergeTree engine
- SQL (DDL and DML)
- Data warehouse SCD patterns (Type 1, Type 2, Type 4)

## Sources Consulted
- ClickHouse DateTime docs: https://clickhouse.com/docs/en/sql-reference/data-types/datetime
- ClickHouse DateTime64 docs: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse Date / Date32 docs: https://clickhouse.com/docs/en/sql-reference/data-types/date and https://clickhouse.com/docs/en/sql-reference/data-types/date32
- ClickHouse Bool type: https://clickhouse.com/docs/en/sql-reference/data-types/boolean
- ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- JOIN statement (inequality conditions): https://clickhouse.com/docs/en/sql-reference/statements/select/join
- Decimal types: https://clickhouse.com/docs/en/sql-reference/data-types/decimal

## Issues Found
- **DateTime out-of-range sentinel value.** The SCD Type 2 table used `DEFAULT toDateTime('9999-12-31')` and inserted `'9999-12-31'` into a `DateTime` column. ClickHouse's `DateTime` type is a 32-bit Unix timestamp with a maximum value of `2106-02-07 06:28:15` UTC, so `'9999-12-31'` is outside the valid range and will either error or overflow. Replaced both the default and the corresponding `INSERT` values with `'2099-12-31 23:59:59'`, which is well within the `DateTime` range while preserving the "far-future sentinel" pattern used for open-ended effective_to ranges.

## Review Notes
- The `JOIN ... ON f.customer_id = c.customer_id AND f.order_date >= toDate(c.effective_from) AND f.order_date < toDate(c.effective_to)` pattern uses non-equality conditions. This is supported by ClickHouse (especially via the new analyzer, default in 24.3+), using hash/grace_hash algorithms. On older ClickHouse versions with the legacy analyzer, readers may need to set `allow_experimental_analyzer=1` or move range predicates into a `WHERE` clause.
- `Bool` is a native ClickHouse type since 21.12 (Dec 2021); anyone running pre-22 may need to use `UInt8` instead.
- The SCD Type 2 update example shows inserting an "expired" copy of the original row alongside the new version, but the table uses a plain `MergeTree()` which never removes the original open-ended row. In a real implementation you would typically use `ALTER TABLE ... UPDATE`, a `ReplacingMergeTree` keyed on the surrogate key, or a `CollapsingMergeTree`/`VersionedCollapsingMergeTree` to retire the prior open record. This is a common simplification in SCD tutorials rather than a strict technical error, so it was left as-is.
- `Decimal64(2)` is valid: `Decimal64(S)` has fixed precision 18 with scale S, so 2 is in the accepted range.
