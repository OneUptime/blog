# Validation Summary: How to Build Unique Visitor Counting with Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- AggregatingMergeTree engine
- Materialized Views
- uniq / uniqExact aggregate functions (HyperLogLog++)
- uniqState / uniqMerge combinators

## Sources Consulted
- ClickHouse documentation on AggregatingMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation on Materialized Views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse documentation on uniq function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse documentation on uniqExact function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse documentation on AggregateFunction type and -State/-Merge combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found
- **Summary mentioned nonexistent "device" dimension**: The summary claimed the materialized view "supports country, page, and device breakdowns" but neither the source table (`page_visits`) nor the materialized view (`daily_unique_visitors`) includes a `device` column. Removed "device" from the summary to accurately reflect the schema defined in the post.

## Review Notes
- The comment "with exact counts for small pages" on the per-page query is technically accurate because ClickHouse's `uniq` (HyperLogLog++) uses exact counting for small cardinalities before switching to approximation, but this is an implementation detail that readers may not be aware of. No change made since the claim is correct.
- The `daily_unique_visitors_exact` table in the "Exact vs Approximate" section omits a `country` column that the approximate version includes. This is not an error (it's a simplified example), but readers copying it should be aware the schemas differ intentionally.
