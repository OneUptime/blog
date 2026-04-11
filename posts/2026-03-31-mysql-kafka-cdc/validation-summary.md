# Validation Summary: How to Use MySQL with Apache Kafka for CDC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (binary logging, replication)
- Apache Kafka (topics, consumers)
- Kafka Connect (REST API, connector deployment)
- Debezium MySQL Connector (CDC, schema history)
- Python kafka-python library (KafkaConsumer)

## Sources Consulted
- MySQL 8.0 Reference Manual — Binary Logging Options: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual — `expire_logs_days` deprecation and `binlog_expire_logs_seconds`: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_expire_logs_seconds
- Debezium MySQL Connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium MySQL Connector required permissions: https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-creating-user
- Debezium change event structure: https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-change-events
- Kafka Connect REST API: https://docs.confluent.io/platform/current/connect/references/restapi.html
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html

## Issues Found
1. **Deprecated `expire_logs_days` config option**: The post targets MySQL 8.0 but used `expire_logs_days`, which was deprecated in MySQL 8.0.1. Replaced with `binlog_expire_logs_seconds = 604800` (equivalent to 7 days). This is the recommended setting per the MySQL 8.0 reference manual.

## Review Notes
- The `FLUSH PRIVILEGES` after `CREATE USER`/`GRANT` is technically unnecessary in MySQL 8.0 (these statements automatically reload the grant tables), but it is not harmful and is a common convention. Left as-is.
- The Debezium JSON envelope shown omits the `source` and `transaction` fields for brevity. This is fine for a tutorial — the key fields (`before`, `after`, `op`, `ts_ms`) are all correct.
- The Python consumer code and JSON example both assume the Kafka Connect JSON converter is configured without schema wrapping (i.e., `schemas.enable=false`). This is consistent and works, but readers should be aware that the default `JsonConverter` includes a schema wrapper. The post could mention this in the future but is not incorrect as presented.
- The connector config uses modern Debezium 2.x property names (`topic.prefix`, `schema.history.internal.*`), which is correct and current.
