# Validation Summary: How to Build a Lambda Architecture for Telemetry: Real-Time OTel Stream + Batch

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Kafka
- Kafka Connect
- Confluent Amazon S3 Sink Connector
- Apache Spark / PySpark
- ClickHouse
- Apache Airflow

## Sources Consulted
- OpenTelemetry Collector Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- Confluent Amazon S3 Sink Connector overview: https://docs.confluent.io/kafka-connectors/s3-sink/current/overview.html
- Confluent Amazon S3 Sink Connector configuration reference: https://docs.confluent.io/kafka-connectors/s3-sink/current/configuration_options.html
- Apache Spark 3.5 PySpark API reference: https://spark.apache.org/docs/3.5.0/api/python/reference/index.html
- Apache Spark SQL built-in functions reference: https://spark.apache.org/docs/3.5.8/sql-ref-functions-builtin.html
- ClickHouse Java/JDBC integration documentation: https://clickhouse.com/integrations/java
- ClickHouse aggregate function examples and combinators documentation: https://clickhouse.com/blog/aggregate-functions-combinators-in-clickhouse-for-arrays-maps-and-states
- Apache Airflow 3 public interface documentation: https://airflow.apache.org/docs/apache-airflow/stable/public-airflow-interface.html
- Apache Airflow cron and scheduling documentation: https://airflow.apache.org/docs/apache-airflow/stable/authoring-and-scheduling/cron.html
- Apache Airflow SparkSubmitOperator API reference: https://airflow.apache.org/docs/apache-airflow-providers-apache-spark/stable/_api/airflow/providers/apache/spark/operators/spark_submit/index.html

## Issues Found
- The Kafka exporter used one archive topic for traces, metrics, and logs. Updated the Collector configuration to use separate Kafka exporters and topics for each signal, matching the current signal-specific Kafka exporter configuration style.
- The Kafka producer used `required_acks: all`. Updated it to `required_acks: -1`, which is the Kafka-compatible value for waiting for all in-sync replicas.
- The S3 sink example implied Confluent's S3 connector could convert raw OTLP protobuf Kafka messages directly to Parquet. Confluent's Parquet format requires schema-aware Connect records, so the post now states that a decoder/normalizer must first convert OTLP into schemaful span records, and the connector example now uses an Avro converter with Schema Registry.
- The S3 partition path mixed a literal `signal_type` path with date formatting and did not match the S3 sink's topic-based object layout. Updated the `path.format`, `topics.dir`, connector topic, and Spark read path so they line up.
- The Spark job imported unused modules and configured a Kafka connector package that was not used by the job. Removed the unused import and replaced the package with the ClickHouse JDBC driver needed by the JDBC write.
- The Spark job calculated batch statistics before deduplication, despite claiming deduplicated results. Updated it to deduplicate spans first and aggregate from the deduplicated DataFrame.
- The Spark batch output did not include a `date` column, but the ClickHouse serving view expected one. Added the processing date to the batch aggregation.
- The ClickHouse view selected unqualified columns from a full outer join and joined without date, which could produce ambiguous or incorrect results. Updated the view to use `coalesce(...)` for keys/date and join on date as well as service and operation.
- The Airflow DAG used the older `schedule_interval` argument and legacy `from airflow import DAG` import. Updated the snippet to use Airflow 3's public `airflow.sdk.DAG` import and `schedule` argument with a timezone-aware `pendulum` start date.

## Review Notes
- The architecture is technically valid after the corrections, but a production implementation still needs the decoder/normalizer job between the OTLP Kafka archive and the schemaful Parquet topic. That job is intentionally referenced but not expanded because the original post focuses on the lambda architecture shape.
- The Spark S3A dependency is environment-specific and often supplied by the Spark distribution or cluster image. If it is not already present, the runtime must include the Hadoop AWS module that matches the deployed Hadoop version.
