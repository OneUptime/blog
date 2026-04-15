# Validation Summary: How to Migrate from Druid to ClickHouse

## Status
validated

## Post Type
Migration Guide / Tutorial

## Technologies Covered
- Apache Druid (real-time analytics database)
- ClickHouse (columnar OLAP database)
- Apache Kafka (for streaming ingestion)
- SummingMergeTree engine
- MergeTree engine
- Kafka table engine in ClickHouse
- DataSketches extension (HLL sketches, quantile sketches)

## Sources Consulted
- Apache Druid SQL function reference: https://druid.apache.org/docs/latest/querying/sql-functions/
- Apache Druid DataSketches Quantiles Sketch module: https://druid.apache.org/docs/latest/development/extensions-core/datasketches-quantiles/
- Apache Druid Coordinator API reference: https://druid.apache.org/docs/latest/api-reference/coordinator-api/
- Apache Druid SQL API: https://druid.apache.org/docs/latest/api-reference/sql-api/
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse uniq function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse quantile function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse fromUnixTimestamp64Milli documentation: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions

## Issues Found

### 1. Incorrect description of export format (Step 3)
- **What was wrong:** The text said "Export via Druid SQL to NDJSON" but the actual code exported to CSV format (`"resultFormat": "csv"`).
- **What was changed:** Updated the description to "Export via Druid SQL to CSV" to match the actual code.
- **Why:** The heading was misleading; the code correctly uses CSV format throughout.

### 2. Incorrect description of ClickHouse `uniq` algorithm (Step 5)
- **What was wrong:** The comment claimed ClickHouse's `uniq` function is "also HLL-based approximation." The `uniq` function actually uses an adaptive sampling algorithm, not HLL. The HLL-specific function in ClickHouse is `uniqHLL12`.
- **What was changed:** Updated the comment from "also HLL-based approximation" to "adaptive sampling approximation."
- **Why:** Technical accuracy about the algorithm used. While both are approximate cardinality estimators, they use different algorithms.

### 3. Invalid Druid SQL quantile function (Step 5)
- **What was wrong:** The Druid SQL example used `QUANTILE(DS_QUANTILES_SKETCH(duration_ms), 0.99)`. `QUANTILE` is not a valid Druid SQL function. The correct functions are `APPROX_QUANTILE_DS(column, probability)` or `DS_GET_QUANTILE(DS_QUANTILES_SKETCH(column), fraction)`.
- **What was changed:** Replaced with `APPROX_QUANTILE_DS(duration_ms, 0.99)` and updated the comment from "DS_QUANTILES_SKETCH + QUANTILE" to "APPROX_QUANTILE_DS (uses DataSketches)."
- **Why:** The original syntax would produce a SQL error in Druid. `APPROX_QUANTILE_DS` is the correct, simpler approach for computing approximate quantiles.

## Review Notes
- The `date -d` syntax used in the monthly export loop (Step 3) is GNU coreutils-specific and will not work on macOS. On macOS, `date -j -v+1m` would be needed. This is acceptable since export scripts typically run on Linux servers, but could be noted for completeness.
- Druid dimensions are described as "string-typed filtering columns." While string is the default and most common type, modern Druid also supports long, float, and double dimension types. This simplification is acceptable for a migration guide.
- The Kafka table engine example (Step 7) omits `session_id` and `country` columns that exist in the target `events_raw` table. ClickHouse will use default values for missing columns, so this works but readers should be aware the example is simplified.
- The summary advice to "Map Druid dimensions to `LowCardinality(String)`" is good general guidance but not universal — only low-cardinality columns (typically under ~10,000 distinct values) benefit from `LowCardinality`. High-cardinality dimensions like `user_id` should remain plain `String`, as shown correctly in the schema examples.
