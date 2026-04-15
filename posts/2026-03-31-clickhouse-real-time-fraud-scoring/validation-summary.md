# Validation Summary: How to Build Real-Time Fraud Scoring with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, Materialized Views, Kafka engine)
- Apache Kafka (streaming ingestion, console producer)
- SQL aggregate combinators (-State / -Merge)
- OneUptime (alerting)

## Sources Consulted
- ClickHouse Kafka Table Engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse Materialized Views documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse -State/-Merge combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- Apache Kafka kafka-console-producer documentation: https://kafka.apache.org/documentation/#basic_ops_producer

## Issues Found

### 1. Kafka table missing column definitions
**What was wrong:** The `transactions_kafka` Kafka engine table was created without any column definitions. ClickHouse Kafka tables require explicit column definitions so the engine knows how to deserialize incoming messages.
**What was changed:** Added the full column list (`tx_id`, `user_id`, `amount`, `merchant_id`, `country`, `status`, `ts`) matching the `transactions` table schema.

### 2. Missing materialized view to bridge Kafka table to transactions table
**What was wrong:** The post defined a Kafka engine table but did not include the required materialized view to pipe data from `transactions_kafka` into the `transactions` table. Without this MV, data consumed from Kafka would be read once and discarded — it would never reach the `transactions` table or the `user_risk_mv` aggregating view.
**What was changed:** Added a `CREATE MATERIALIZED VIEW transactions_kafka_mv TO transactions AS SELECT * FROM transactions_kafka;` statement after the Kafka table definition.

### 3. Deprecated `--broker-list` flag in kafka-console-producer
**What was wrong:** The `kafka-console-producer` command used `--broker-list`, which is deprecated in favor of `--bootstrap-server` in modern Kafka versions (2.5+).
**What was changed:** Replaced `--broker-list` with `--bootstrap-server`.

## Review Notes
- The fraud score query references column aliases (`tx_count_1h`, `amount_sum_1h`, etc.) within the same SELECT clause to compute `risk_score`. This works in ClickHouse because it supports alias reuse within a single SELECT, but this is non-standard SQL behavior and could surprise readers coming from other databases.
- The `uniq` function used via `uniqState`/`uniqMerge` is an approximate distinct count. For fraud scoring this is usually acceptable, but readers should be aware it is not exact. `uniqExact` could be used if precision is critical.
- The `DateTime` type (without timezone) is used for `ts`. In multi-region fraud detection scenarios, `DateTime64` with explicit timezone may be more appropriate.
