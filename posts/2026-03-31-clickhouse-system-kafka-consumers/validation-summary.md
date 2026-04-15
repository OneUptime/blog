# Validation Summary: How to Use system.kafka_consumers in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, Kafka engine integration)
- Apache Kafka (consumer groups, partition offsets)
- SQL (ClickHouse dialect — array functions, JSON extraction)

## Sources Consulted
- ClickHouse official documentation: system.kafka_consumers table (https://clickhouse.com/docs/en/operations/system-tables/kafka_consumers)
- ClickHouse official documentation: Kafka table engine (https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka)
- ClickHouse official documentation: array functions (arraySum, arrayZip, arrayJoin)
- ClickHouse official documentation: JSON functions (JSONExtractInt, JSONExtractRaw, JSONExtractArrayRaw)

## Issues Found

### 1. Fabricated `assignments` sub-columns (Key Columns table)
**What was wrong:** The post listed `assignments.offset_committed` (Array(Int64)), `assignments.offset_end` (Array(Int64)), and `assignments.messages_in_flight` (Array(Int64)) as columns of `system.kafka_consumers`. None of these columns exist. The actual `assignments` sub-columns are only `topic`, `partition_id`, `current_offset`, and `intent_size`.
**What was changed:** Removed the three non-existent columns. Added the real column `assignments.intent_size` (Array(Nullable(Int64))). Also added other real columns missing from the table: `num_commits`, `last_poll_time`, `last_commit_time`, and `rdkafka_stat`.

### 2. Wrong exception columns (Key Columns table and multiple queries)
**What was wrong:** The post listed `last_exception_time` (DateTime) and `last_exception` (String) as scalar columns. These do not exist. The real columns are `exceptions.time` (Array(DateTime)) and `exceptions.text` (Array(String)), which store the 10 most recent exceptions as arrays.
**What was changed:** Fixed the column table to show the correct array-based exception columns. Updated all queries that referenced `last_exception_time` and `last_exception` to use `exceptions.time[-1]` and `exceptions.text[-1]` (negative indexing for the most recent entry). Updated the error detection query's WHERE clause to use `length(exceptions.text) > 0`.

### 3. Invalid use of `sum()` on array column (Viewing Active Consumers query)
**What was wrong:** `sum(assignments.current_offset)` is invalid because `assignments.current_offset` is an Array(Int64), not a scalar. The `sum()` aggregate function cannot operate on arrays.
**What was changed:** Replaced with `arraySum(assignments.current_offset)` which correctly sums elements within each row's array.

### 4. Invalid tuple unpacking syntax and non-existent columns (Calculating Consumer Lag Per Partition)
**What was wrong:** The query used `arrayJoin(...) AS (partition, current_offset, end_offset, lag)` which is not valid ClickHouse syntax — ClickHouse does not support tuple destructuring in column aliases. Additionally, the entire query referenced `assignments.offset_end` which does not exist, making lag calculation impossible from these columns alone.
**What was changed:** Replaced the section with two working queries: (1) a query using `ARRAY JOIN` with `arrayZip` to show current offsets per partition, and (2) a query extracting per-partition consumer lag from the `rdkafka_stat` JSON column (which contains librdkafka statistics including `consumer_lag`). Renamed section to "Viewing Current Offsets Per Partition" to accurately reflect content.

### 5. Total Lag query referenced non-existent `assignments.offset_end` column
**What was wrong:** The "Total Lag Across All Consumers" query computed lag using `assignments.offset_end` which does not exist in the table.
**What was changed:** Replaced with a "Total Messages and Commits Across All Consumers" query using the real columns `num_messages_read` and `num_commits`, which provide useful aggregate consumer activity metrics.

### 6. Monitoring Lag Over Time query referenced non-existent column
**What was wrong:** The lag history INSERT query used `assignments.offset_end` which does not exist.
**What was changed:** Replaced with a consumer activity history approach that snapshots `num_messages_read` and `num_commits` per consumer, which are real columns. Renamed section to "Monitoring Consumer Activity Over Time".

### 7. Mermaid diagram label inaccuracy
**What was wrong:** The diagram label said "shows offset and lag" but lag is not directly exposed as a column (it requires parsing `rdkafka_stat` JSON).
**What was changed:** Updated label to "shows offsets and consumer state".

### 8. Summary paragraph inaccuracies
**What was wrong:** Summary claimed the table could be used to "calculate per-partition lag" and "track lag over time" which is misleading since lag requires parsing the `rdkafka_stat` JSON column rather than being directly queryable.
**What was changed:** Updated summary to accurately reflect capabilities: mentions `rdkafka_stat` for lag, references throughput monitoring and error detection as primary use cases.

## Review Notes
- The `rdkafka_stat` column contains comprehensive librdkafka statistics as JSON, including per-partition `consumer_lag`, `hi_offset`, `lo_offset`, and other metrics. This is the primary way to get lag information from `system.kafka_consumers`. The JSON structure is nested (topics -> partitions) and requires ClickHouse JSON functions to parse.
- The post could benefit from mentioning `is_currently_used` (UInt8) and `last_rebalance_time` (DateTime) columns which are useful for diagnosing consumer health issues, but these were not added to avoid scope creep.
- The Kafka engine CREATE TABLE syntax is correct and uses current, non-deprecated settings.
- The `arrayZip`, `arraySum`, and `greatest` functions referenced in the post are all valid ClickHouse functions.
