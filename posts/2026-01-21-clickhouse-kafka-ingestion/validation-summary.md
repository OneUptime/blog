# Validation Summary: How to Ingest Data into ClickHouse from Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Kafka table engine
- Apache Kafka consumers and consumer groups
- ClickHouse materialized views
- MergeTree and ReplacingMergeTree tables
- ClickHouse input formats: JSONEachRow, AvroConfluent, Protobuf, CSV, TabSeparated, RawBLOB, JSONAsString
- ClickHouse system tables for Kafka monitoring and dead letter queues

## Sources Consulted
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse Kafka integration guide: https://clickhouse.com/docs/integrations/kafka/kafka-table-engine
- ClickHouse `system.kafka_consumers` documentation: https://clickhouse.com/docs/operations/system-tables/kafka_consumers
- ClickHouse `system.dead_letter_queue` documentation: https://clickhouse.com/docs/operations/system-tables/dead_letter_queue
- ClickHouse formats overview: https://clickhouse.com/docs/interfaces/formats
- ClickHouse AvroConfluent format documentation: https://clickhouse.com/docs/interfaces/formats/AvroConfluent
- ClickHouse Protobuf format documentation: https://clickhouse.com/docs/interfaces/formats/Protobuf
- ClickHouse `system.query_log` documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- Apache Kafka consumer configuration documentation: https://kafka.apache.org/41/configuration/consumer-configs/
- Confluent Kafka consumer design documentation: https://docs.confluent.io/kafka/design/consumer-design.html

## Issues Found
- Corrected Kafka virtual partition metadata types from `UInt32` to `UInt64`, matching ClickHouse's `_partition` virtual column.
- Corrected `kafka_security_protocol` example from `SASL_SSL` to the documented table-setting value `sasl_ssl`.
- Moved TLS certificate location settings out of Kafka table `SETTINGS` and into ClickHouse server `librdkafka` configuration, because those options are configured through the Kafka config section rather than the documented SQL table-engine setting list.
- Changed the Protobuf Kafka schema example to use `kafka_schema`, which is the Kafka engine setting for formats requiring a schema.
- Added required Kafka engine settings (`kafka_broker_list`, `kafka_topic_list`, and `kafka_group_name`) to examples that created Kafka tables with only `kafka_format`.
- Removed a declared `_topic` column from the multi-topic table example and used ClickHouse's virtual `_topic` column instead.
- Fixed RawBLOB and JSONAsString materialized view examples so parsed timestamps are converted to `DateTime`, target-table columns are populated, and Kafka metadata is persisted correctly.
- Replaced placeholder SQL using `...` with concrete column definitions or executable queries.
- Corrected the claim that each Kafka consumer automatically runs in its own thread; independent per-consumer flushing requires `kafka_thread_per_consumer = 1`.
- Replaced invalid `system.kafka_consumers` queries that referenced nonexistent columns such as `consumer_group`, `topic`, `partition`, `current_offset`, and `end_offset` with queries using the documented array columns under `assignments`.
- Removed direct lag calculations from `system.kafka_consumers`, because the documented system table exposes current offsets and assignments but not end offsets. The post now recommends Kafka tooling or exporters for lag.
- Replaced the nonexistent `kafka_auto_offset_reset` table setting with a ClickHouse server config example for the underlying Kafka consumer `auto_offset_reset` option.
- Reworked the dead letter queue section to use `kafka_handle_error_mode = 'dead_letter_queue'` and `system.dead_letter_queue`, matching current ClickHouse behavior.
- Fixed parsing-error guidance so `kafka_handle_error_mode = 'stream'` is presented as a Kafka table setting rather than a session `SET` command.
- Replaced a query-log example that used an unverified `ProfileEvents['KafkaMessagesRead']` expression with a documented `written_rows` query against `system.query_log`.

## Review Notes
The guide is technically relevant and accurate after the corrections. For ClickHouse Cloud deployments, ClickHouse documentation recommends ClickPipes for Kafka ingestion; the native Kafka engine remains valid for self-managed and native-engine use cases.
