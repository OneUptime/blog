# Validation Summary: How to Use Window Frame Specifications in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- Window Functions (ROWS and RANGE frame specifications)
- SQL (aggregate window functions: sum, avg)

## Sources Consulted
- ClickHouse official documentation — Window Functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse GitHub issue #72227 — RANGE frame limitations and supported data types
- Altinity blog — ClickHouse Window Functions: Current State of the Art

## Issues Found
- **Incorrect RANGE explanation (line 88):** The paragraph under the RANGE query incorrectly claimed that January 2nd and January 3rd sharing the same `amount` value (150) illustrates RANGE tie-handling. However, the query orders by `toInt32(sale_date)`, not by `amount`. Since each date is unique, there are no ties in the ORDER BY column — RANGE here operates on value distance (date integers within 2 of the current row), not tie grouping. The explanation was rewritten to correctly describe value-distance behavior on the date column and to point the reader to the later section where tie-handling is properly demonstrated.

## Review Notes
- ClickHouse does not support the GROUPS frame type (only ROWS and RANGE). The post correctly limits its scope to ROWS and RANGE.
- RANGE frame offsets in ClickHouse are restricted to non-negative 32-bit integers. The post's use of small integer offsets (2) is fine, but readers working with larger ranges or DateTime64/Decimal columns should be aware of this limitation.
- The `toInt32(sale_date)` cast in the RANGE example converts a Date to days-since-epoch, which is a valid approach but may not be obvious to all readers. An alternative would be casting to a Date type and using numeric day offsets directly.
- All SQL syntax in the post is correct and compatible with current ClickHouse versions.
- The ROWS vs RANGE tie comparison in the final query section is accurate and well-demonstrated.
