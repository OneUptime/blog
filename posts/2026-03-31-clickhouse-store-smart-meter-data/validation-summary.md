# Validation Summary: How to Store Smart Meter Data in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, Kafka engine, materialized views, TTL)
- SQL (DDL, analytical queries)
- Apache Kafka (as ingestion source)
- HTTP interface for bulk ingestion (curl)

## Sources Consulted
- ClickHouse MergeTree engine family documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse Kafka engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse materialized views documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse aggregate function combinators (-State/-Merge): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found

### 1. Text/code mismatch for engine type (line 17)
- **What was wrong:** The prose stated "Use a `ReplacingMergeTree`" but the SQL code correctly used `ENGINE = MergeTree()`. Plain `MergeTree` is the correct choice for append-only time-series data; `ReplacingMergeTree` is for deduplication scenarios.
- **What was changed:** Updated the text from `ReplacingMergeTree` to `MergeTree` to match the code.

### 2. Incorrect daily energy totals formula (line 100)
- **What was wrong:** The query `sum(active_power_kw) / count() * 0.25` computes `avg(power) * 0.25 hours`, which yields the energy of a single 15-minute interval, not a daily total across all meters.
- **What was changed:** Removed the `/ count()` divisor so the formula is `sum(active_power_kw) * 0.25`. Each reading represents a 15-minute (0.25 hour) sample, so `power_kw * 0.25` gives the energy contribution of that interval; summing these gives the correct total.

### 3. SummingMergeTree misused for pre-aggregated hourly table (lines 111-132)
- **What was wrong:** `SummingMergeTree` sums all numeric columns when merging rows with the same key. This is correct for additive metrics (e.g., counts, totals) but semantically wrong for `avg_kw` (summing averages is meaningless) and `max_kw` (summing maximums inflates the value). When data for the same `(meter_id, hour)` arrives in multiple insert batches, the merged results would be incorrect.
- **What was changed:** Replaced `SummingMergeTree` with `AggregatingMergeTree` and converted columns to `AggregateFunction` types. The materialized view now uses `-State` combinators (`avgState`, `maxState`, `minState`) so that partial aggregates merge correctly across batches. The `kwh_delta` column was replaced with separate `max_kwh`/`min_kwh` aggregate columns, since the delta must be computed at query time via `maxMerge(max_kwh) - minMerge(min_kwh)`.

## Review Notes
- The Kafka engine table (`smart_meter_kafka_queue`) defines only 4 of the 7 columns in the target table. The `SELECT *` in the materialized view will insert default values (zeros) for the missing columns (`voltage_v`, `current_a`, `quality_flag`). This is valid ClickHouse behavior and likely intentional for a simplified example, but worth noting.
- The volume estimate of ~35 billion rows/year for 1M meters at 15-minute intervals is accurate (1M x 96 readings/day x 365 = 35.04B).
- The post does not show how to query the `AggregatingMergeTree` table (which requires `-Merge` combinators like `avgMerge(avg_kw)`). This would be a natural addition but was not added to avoid scope expansion.
