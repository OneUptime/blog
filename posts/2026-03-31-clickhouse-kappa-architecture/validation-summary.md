# Validation Summary: How to Use the Kappa Architecture with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree family, Kafka table engine, materialized views)
- Apache Kafka (consumer groups, offset reset tooling)
- Kappa architecture (stream-processing pattern proposed by Jay Kreps)

## Sources Consulted
- ClickHouse docs — Kafka table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse docs — ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse docs — SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse docs — Materialized Views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse docs — FINAL modifier: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier
- Apache Kafka docs — kafka-consumer-groups tool: https://kafka.apache.org/documentation/#basic_ops_consumer_group
- Jay Kreps, "Questioning the Lambda Architecture": https://www.oreilly.com/radar/questioning-the-lambda-architecture/
- Cross-checked against neighboring posts in this blog (e.g. `clickhouse-kafka-engine`, `clickhouse-lambda-architecture`, `clickhouse-deduplication`, `clickhouse-debezium-cdc-pipeline`) for consistency of the Kafka engine + MV + ReplacingMergeTree pattern.

## Issues Found
1. **`ENGINE = ReplacingMergeTree(event_id)` used UUID as the version column.** ClickHouse's `ver` argument must be one of `UInt*`, `Date`, `Date32`, `DateTime`, or `DateTime64`; `UUID` is not supported, so the DDL would be rejected. Additionally, `event_id` was not in the `ORDER BY`, so even if the engine had accepted it, dedup would have operated on `(user_id, event_time)` alone — collapsing legitimate distinct events. Changed engine to `ReplacingMergeTree()` and moved `event_id` into the sort key (`ORDER BY (user_id, event_time, event_id)`) so retried Kafka deliveries of the same event are correctly identified as duplicates, while distinct events are preserved.

2. **Kafka engine table `raw_events_kafka` had no column list.** The ClickHouse Kafka engine requires an explicit column definition to parse incoming messages; `CREATE TABLE ... ENGINE = Kafka SETTINGS ...` with no columns is not valid DDL. Added the four columns (`event_time`, `user_id`, `event_type`, `payload`) that the downstream materialized view selects. Used plain `String` instead of `LowCardinality(String)` for `event_type` on the Kafka side — LowCardinality is a storage optimization for MergeTree parts and is not needed on the Kafka consumer table; conversion happens at insert time into `raw_events`.

## Review Notes
- The `FINAL` query is valid but costly at scale. ClickHouse has `SELECT ... SETTINGS final = 1` and, more importantly, `do_not_merge_across_partitions_select_final` and the newer ReplacingMergeTree dedup-at-query semantics; for high-volume paths users typically prefer `argMax`-style aggregations or the `FINAL` modifier combined with small partitions. Not corrected — the original framing is accurate for a tutorial.
- The chained MV pattern (Kafka → `raw_events_mv` → `raw_events` → `hourly_event_counts`) relies on cascaded MV triggering, which is the default behaviour in modern ClickHouse. Worth noting to readers that `parallel_view_processing` and error-handling settings may matter in production, but these are out of scope for the post.
- The Kafka consumer-group reset command requires the group to have no active members at the time of reset; the post doesn't mention this, but it's a Kafka caveat rather than a blog-post error.
- Kafka source table uses `kafka_num_consumers = 4`, which should be ≤ the number of partitions on the `raw_events` topic for the consumers to actually be assigned work. Again a deployment caveat, not an error in the tutorial.
