# Validation Summary: Reset a Databricks Streaming Checkpoint Without Data Loss

## Status

validated

## Post Type

Technical guide and production recovery runbook

## Technologies Covered

- Databricks Runtime
- Apache Spark Structured Streaming
- Structured Streaming checkpoints and state stores
- Delta Lake streaming sources and sinks
- Delta Lake change data feed
- Databricks Auto Loader
- Apache Kafka streaming source
- PySpark
- Databricks SQL
- `foreachBatch` idempotent writes

## Sources Consulted

- [Databricks: Structured Streaming checkpoints](https://docs.databricks.com/aws/en/structured-streaming/checkpoints)
- [Apache Spark: Recovering Structured Streaming queries with checkpointing](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#recovering-from-failures-with-checkpointing)
- [Apache Spark: Structured Streaming and Kafka integration](https://spark.apache.org/docs/latest/streaming/structured-streaming-kafka-integration.html)
- [Databricks: Delta Lake table streaming reads and writes](https://docs.databricks.com/aws/en/structured-streaming/delta-lake)
- [Databricks: Use change data feed](https://docs.databricks.com/aws/en/tables/features/change-data-feed)
- [Databricks: What is Auto Loader?](https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/)
- [Databricks: Spark API options reference](https://docs.databricks.com/aws/en/spark/api-options)
- [Databricks: `cloud_files_state` table-valued function](https://docs.databricks.com/aws/en/sql/language-manual/functions/cloud_files_state)
- [Databricks: Use `foreachBatch` to write to arbitrary data sinks](https://docs.databricks.com/aws/en/structured-streaming/foreach)
- [Databricks: Schema evolution in the state store](https://docs.databricks.com/aws/en/stateful-applications/schema-evolution)
- [Databricks: Build a custom stateful application](https://docs.databricks.com/aws/en/stateful-applications/)
- [Databricks: Legacy arbitrary stateful operators](https://docs.databricks.com/aws/en/stateful-applications/legacy)
- [Databricks: `SHOW TBLPROPERTIES`](https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-aux-show-tblproperties)

## Issues Found

- The post represented Auto Loader's `source_id` value as numeric `0`, but the documented result type is `STRING`. Changed it to the string `'0'`.
- The post stated without exception that changing a state schema is incompatible with an existing checkpoint. Current Databricks supports specific state-store schema evolution patterns for `transformWithState` and `transformWithStateInPandas`. Added that exception and noted that field-level changes require Avro state-store encoding, while preserving the warning for incompatible changes.

## Review Notes

- Verified that all eight documentation links in the post resolve to the intended official Databricks or Apache Spark pages.
- Verified the PySpark APIs and options used in the examples: Kafka `startingOffsets` and `failOnDataLoss`, Delta `readChangeFeed` and `startingVersion`, Delta `txnAppId` and `txnVersion`, `checkpointLocation`, `availableNow`, and `toTable`/`saveAsTable`.
- Verified the SQL forms for `DESCRIBE HISTORY`, `SHOW TBLPROPERTIES`, and `cloud_files_state`. The business-column aggregation example intentionally depends on the target having the illustrated lineage columns, as the post already states.
- The Databricks Runtime 18.2 source-evolution behavior and the Databricks Runtime 16.4/18.2 `cloud_files_state` caveats are current as of the validation date.
- The seven-day `VACUUM` data-file retention and 30-day transaction-log retention values are defaults and remain table-configurable, as the post describes them.
