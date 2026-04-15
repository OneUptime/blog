# Validation Summary: How to Migrate from Snowflake to ClickHouse

## Status
validated

## Post Type
Migration Guide / Tutorial

## Technologies Covered
- Snowflake (data warehouse, SQL, COPY INTO, Scripting, Dynamic Tables, VARIANT type)
- ClickHouse (MergeTree, AggregatingMergeTree, materialized views, s3() table function, JSON functions)
- AWS S3 (data staging for migration)
- Parquet and CSV file formats

## Sources Consulted
- ClickHouse documentation for JSONExtract functions: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse documentation for AggregateFunction data type: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse documentation for AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation for SimpleAggregateFunction: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- ClickHouse documentation for s3() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- Snowflake documentation for COPY INTO <location>: https://docs.snowflake.com/en/sql-reference/sql/copy-into-location
- Snowflake documentation for Snowflake Scripting: https://docs.snowflake.com/en/developer-guide/snowflake-scripting/index
- Snowflake documentation for Dynamic Tables: https://docs.snowflake.com/en/user-guide/dynamic-tables-about
- Existing validated blog posts in the repository on ClickHouse AggregateFunction data type and materialized views with AggregatingMergeTree

## Issues Found

### Issue 1: Invalid `'$'` path in JSONExtractString (FLATTEN/arrayJoin example)
- **Location:** Step 4, FLATTEN → arrayJoin code example
- **Problem:** `JSONExtractString(tag, '$')` used `'$'` as a path argument. ClickHouse's JSONExtract functions do not use JSONPath `$` syntax. The `'$'` would be interpreted as a literal key name, not a root reference.
- **Fix:** Changed to `JSONExtract(tag, 'String')` which correctly parses a raw JSON element (returned by `JSONExtractArrayRaw`) and extracts it as a String type.

### Issue 2: Invalid `'$'` path in JSONExtractString (VARIANT access example)
- **Location:** Step 5, VARIANT column access code example
- **Problem:** `JSONExtractString(JSONExtractArrayRaw(properties, 'tags')[1], '$')` had the same invalid `'$'` path argument as Issue 1.
- **Fix:** Changed to `JSONExtract(JSONExtractArrayRaw(properties, 'tags')[1], 'String')`.

### Issue 3: Type mismatch between SummingMergeTree table and uniqState in materialized view
- **Location:** Step 6, Dynamic Tables replacement
- **Problem:** The destination table used `ENGINE = SummingMergeTree((total, unique_users))` with `unique_users UInt64`, but the materialized view used `uniqState(user_id)` which returns `AggregateFunction(uniq, Int64)`. This is a type mismatch that would cause an insert error. SummingMergeTree cannot correctly aggregate unique counts anyway — summing unique user counts from different batches produces incorrect results.
- **Fix:** Changed the engine to `AggregatingMergeTree()`, changed `total` column to `SimpleAggregateFunction(sum, UInt64)`, and changed `unique_users` column to `AggregateFunction(uniq, Int64)`. The materialized view's `uniqState(user_id)` is now compatible with the destination column type.

## Review Notes
- The Snowflake storage cost of "$23/TB/month" is approximately correct for on-demand storage in standard US regions but varies by region and edition. This is acceptable for a general guide.
- The `HEADER = TRUE` in the Parquet COPY INTO command is unnecessary since Parquet files always include column metadata. Snowflake likely ignores this option for Parquet format. Left as-is since it doesn't cause errors.
- The data type mapping table is comprehensive and accurate. The CHAR(n) → FixedString(n) mapping is technically valid but in practice ClickHouse's String type is often preferred since FixedString pads with null bytes.
- The Snowflake Scripting example for date-partitioned export uses valid syntax with `LET` for block-scoped variable declaration and bind variables in COPY INTO paths.
- The SQL function translation examples (IFF, ZEROIFNULL, DATEADD, DATEDIFF, TO_TIMESTAMP, OBJECT_CONSTRUCT, SPLIT_TO_TABLE, GENERATOR) are all accurate.
- Querying the AggregatingMergeTree destination table requires `-Merge` combinators (e.g., `uniqMerge(unique_users)`) — the post doesn't show query syntax for the materialized view results, which could be noted in a future update.
