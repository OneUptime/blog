# Validation Summary: How to Use ORDER BY in ClickHouse with NULLS FIRST/LAST

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- SQL (ORDER BY, NULLS FIRST/LAST, COLLATE)

## Sources Consulted
- ClickHouse official documentation — ORDER BY clause: https://clickhouse.com/docs/en/sql-reference/statements/select/order-by
- ClickHouse official documentation — system.collations table: https://clickhouse.com/docs/en/operations/system-tables/collations

## Issues Found

1. **Incorrect default NULL sorting behavior (critical)**: The post stated "By default, ClickHouse places NULLs at the beginning for ascending sorts and at the end for descending sorts." This is wrong. Per the official documentation, ClickHouse defaults to NULLS LAST for both ASC and DESC — the sort order is: values, then NaN, then NULL. Fixed the description and updated the SQL comments and examples to reflect the correct default behavior.

2. **Wrong COLLATE syntax order**: The post had `ORDER BY name COLLATE 'de' ASC`, placing COLLATE before ASC/DESC. Per the ClickHouse documentation, the correct syntax requires COLLATE to come after ASC/DESC: `ORDER BY name ASC COLLATE 'de'`. Fixed both COLLATE examples.

3. **Misleading comment in practical example**: The comment said "Find the 20 most recent high-value purchases per user" but `LIMIT 20` applies to the entire result set, not per user. Changed to "Find the top 20 high-value purchases, ordered by user and recency" to accurately describe the query behavior.

## Review Notes
- The claim that `COLLATE 'en'` provides "case-insensitive sort" is a simplification — ICU collation provides locale-aware ordering that treats case as a secondary sort criterion, which is similar to but not exactly the same as case-insensitive comparison. This is acceptable for a blog post audience.
- The `system.collations` table and its `name` column were confirmed to exist in the ClickHouse documentation.
- All other SQL syntax (GROUP BY with aliases in ORDER BY, EXPLAIN, LIMIT optimization, toStartOfHour, count(), sum()) is correct.
