# Validation Summary: How to Use Lightweight DELETE in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse Lightweight DELETE feature
- ClickHouse system tables (`system.parts`)

## Sources Consulted
- ClickHouse DELETE statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse system.parts documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse settings documentation: https://clickhouse.com/docs/en/operations/settings/settings

## Issues Found

1. **Incorrect limitation about ReplacingMergeTree/CollapsingMergeTree**: The post claimed "Lightweight DELETE does not work on `ReplacingMergeTree` or `CollapsingMergeTree` with special semantics." This is incorrect — the ClickHouse documentation states lightweight DELETE is available for the entire `*MergeTree` table engine family, which includes all variants. The actual documented limitation is that lightweight DELETE does not work on tables with **projections** by default. Corrected the bullet point to reference the projections limitation and the `lightweight_mutation_projection_mode` setting.

2. **Incorrect limitation about subqueries**: The post claimed "DELETE with subqueries is not supported - use a direct predicate." The ClickHouse documentation does not list this as a restriction. The DELETE WHERE clause accepts standard expressions, which include subqueries. Replaced this bullet with the actual documented limitation that large volumes of lightweight deletes can negatively affect SELECT query performance.

## Review Notes
- The `allow_experimental_lightweight_delete` setting mentioned in the post existed in older ClickHouse versions but has been removed from current documentation, confirming the post's note that it was only needed on older versions. The post's claim that lightweight DELETE is generally available on ClickHouse 23.3+ is approximately correct.
- The post correctly states that rows become invisible immediately after DELETE returns. The official docs confirm that by default, DELETE waits until marking rows as deleted is completed before returning (controlled by the `lightweight_deletes_sync` setting). Async mode exists but is not the default.
- Internally, lightweight DELETE is implemented as a mutation (specifically an `ALTER TABLE...UPDATE _row_exists = 0` operation), but it is much lighter than traditional `ALTER TABLE...DELETE` mutations that rewrite entire data parts. The post's description captures this distinction accurately.
- The `has_lightweight_delete` column in `system.parts` was confirmed in the official documentation.
