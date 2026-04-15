# Validation Summary: How to Use ClickHouse for Retail Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, SQL dialect)
- SQL (CTEs, JOINs, aggregations, window-less analytics)
- Retail analytics patterns (sales rollups, customer segmentation, basket analysis, inventory turnover)

## Sources Consulted
- ClickHouse SQL Reference — CREATE TABLE: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse MergeTree Engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Data Types (Decimal, LowCardinality, UInt*, Float32): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse Functions — toYYYYMM, toStartOfWeek, toDate, today, multiIf, coalesce, nullIf, round: https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse Date arithmetic (subtracting integers from Date/DateTime): https://clickhouse.com/docs/en/sql-reference/data-types/date

## Issues Found
No technical issues found.

## Review Notes
- `toStartOfWeek()` defaults to mode 0 (Sunday as start of week). Some retail contexts prefer Monday; this is a business choice, not a technical error.
- The inventory turnover query groups only by `product_id` (not `store_id`), giving a product-level view across all stores. This is a valid analytical choice. Store-level turnover could be obtained by adding `i.store_id` to the GROUP BY.
- All SQL uses modern ClickHouse syntax (e.g., `ENGINE = MergeTree` without parentheses, `count()` without arguments), which is current and idiomatic.
