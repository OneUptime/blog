# Validation Summary: How to Use system.processors_profile_log in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, query profiling)
- SQL (ClickHouse dialect)
- ClickHouse server XML configuration

## Sources Consulted
- ClickHouse official documentation for `system.processors_profile_log`: https://clickhouse.com/docs/en/operations/system-tables/processors_profile_log
- ClickHouse settings reference for `log_processors_profiles`: https://clickhouse.com/docs/en/operations/settings/settings

## Issues Found
1. **Incorrect column name `processor_id`**: The blog listed a column called `processor_id` (UInt64) in the Key Columns table. The actual column name in `system.processors_profile_log` is `id`, not `processor_id`. Fixed by renaming to `id` and updating the description to match the official docs ("ID of the processor").
2. **Incorrect type for `name` column**: The blog listed the type of the `name` column as `String`. The actual type is `LowCardinality(String)`. Fixed to reflect the correct type.

## Review Notes
- The `SET log_processors_profiles = 1` setting name is correct per official documentation.
- The XML configuration snippet follows the standard ClickHouse server config pattern for system log tables and is correct.
- All SQL queries are syntactically valid and use correct column names (none of the queries referenced `processor_id`, so they would have worked regardless of the Key Columns table error).
- The Mermaid pipeline diagram uses plausible ClickHouse processor class names (FilterTransform, ExpressionTransform, AggregatingTransform, etc.) and correctly represents a typical aggregation query pipeline.
- The explanations of wait types (elapsed_us, input_wait_elapsed_us, output_wait_elapsed_us) accurately describe ClickHouse's processor-level profiling semantics.
- The filter selectivity calculation is mathematically correct and the interpretation guidance is accurate.
