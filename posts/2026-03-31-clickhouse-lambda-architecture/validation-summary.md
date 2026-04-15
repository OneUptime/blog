# Validation Summary: How to Use the Lambda Architecture with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree, Kafka table engine, Materialized Views)
- Apache Kafka
- Apache Spark
- Lambda Architecture (batch + speed + serving layers)

## Sources Consulted
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse MergeTree TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse CREATE VIEW documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view
- ClickHouse LowCardinality documentation: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- Apache Spark spark-submit documentation: https://spark.apache.org/docs/latest/submitting-applications.html

## Issues Found

### Issue 1: Kafka engine table missing column definitions
- **What was wrong:** The `events_kafka_queue` table was defined without any column definitions. ClickHouse Kafka engine tables require an explicit column list matching the expected message schema.
- **What was changed:** Added `event_time DateTime`, `user_id UInt64`, and `event_type String` columns to the Kafka table definition.
- **Why:** Without column definitions, the `CREATE TABLE` statement would fail. The Kafka engine needs to know how to deserialize incoming messages.

### Issue 2: Misleading explanation of ReplacingMergeTree deduplication scope
- **What was wrong:** The "When the Batch Job Catches Up" section stated that `ReplacingMergeTree` deduplicates the overlap between the batch and speed layers. In reality, `ReplacingMergeTree` only deduplicates rows within the same table (`events_batch`), not across separate tables. The cross-table overlap is handled by the `WHERE` clause in the serving view.
- **What was changed:** Rewrote the section to clarify that the `WHERE` clause in the serving view handles cross-table overlap, and that `ReplacingMergeTree` with `FINAL` deduplicates within `events_batch` when re-inserted batch aggregates share the same ORDER BY key.
- **Why:** The original text could mislead readers into thinking `ReplacingMergeTree` handles inter-table deduplication, which is incorrect and could lead to architectural mistakes.

## Review Notes
- The `ReplacingMergeTree()` is used without a version column. This means ClickHouse will keep an arbitrary row among duplicates during merges. If the batch job inserts corrected aggregates, there is no guarantee the latest row is kept. For production use, adding a version column (e.g., a batch run timestamp) would be advisable so the most recent aggregate always wins.
- The `FINAL` keyword can have significant performance overhead on large tables as it forces synchronous deduplication at query time. The post could mention `OPTIMIZE TABLE ... FINAL` as an alternative for periodic background deduplication.
- The serving view uses a correlated subquery `(SELECT max(event_date) FROM events_batch)` which executes for every query. For high-QPS serving workloads, caching this boundary or using a settings table could improve performance.
