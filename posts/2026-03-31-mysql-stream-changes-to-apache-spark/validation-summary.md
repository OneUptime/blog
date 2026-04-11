# Validation Summary: How to Stream MySQL Changes to Apache Spark

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (binary log / CDC configuration)
- Apache Kafka (message broker)
- Kafka Connect (connector framework)
- Debezium (MySQL CDC connector)
- Apache Spark Structured Streaming (PySpark)
- Delta Lake / JDBC sink

## Sources Consulted
- Debezium MySQL Connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium connector properties (topic.prefix, schema.history.internal.*): https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-property-topic-prefix
- Kafka Connect converter configuration: https://kafka.apache.org/documentation/#connect_configs
- PySpark Structured Streaming + Kafka integration: https://spark.apache.org/docs/latest/structured-streaming-kafka-integration.html
- PySpark `get_json_object` API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.get_json_object.html
- PySpark `Column.isin` API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Column.isin.html
- MySQL binary log configuration: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html

## Issues Found
- **Missing Kafka Connect converter configuration in Debezium connector**: The Spark code uses JSON paths like `$.op` and `$.after.id`, which assume the Debezium messages are plain JSON without schema wrapping. However, the default Kafka Connect `JsonConverter` sets `schemas.enable=true`, which wraps every message in a `{"schema": ..., "payload": ...}` envelope. Without this wrapping, paths would need to be `$.payload.op`, `$.payload.after.id`, etc. Added `key.converter`, `key.converter.schemas.enable`, `value.converter`, and `value.converter.schemas.enable` properties to the Debezium connector config to ensure messages are emitted as plain JSON, matching the Spark parsing code.

## Review Notes
- The post imports `from_json`, `StructType`, `StructField`, and `StringType` but never uses them (only `get_json_object` is used for JSON parsing). These unused imports are harmless but could confuse readers.
- The `foreachBatch` sink uses `outputMode("update")` with JDBC `.mode("append")`. Since "update" mode re-emits changed aggregation rows, this will produce duplicate aggregate entries in the MySQL target table over time. A production pipeline would need upsert logic (e.g., using `REPLACE INTO` or `ON DUPLICATE KEY UPDATE`), but this is a design consideration rather than a code error.
- The post uses Debezium 2.x property names (`topic.prefix`, `schema.history.internal.*`), which is current and correct.
