# Validation Summary: What Is Debezium for MySQL CDC

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- MySQL (5.7+ / 8.0) binary logging and replication
- Debezium 2.x (MySQL Connector)
- Apache Kafka and Kafka Connect
- Docker (for deployment)
- Python kafka-python library (for consuming events)

## Sources Consulted
- Debezium MySQL Connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium event structure documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-events
- Kafka Connect REST API documentation: https://docs.confluent.io/platform/current/connect/references/restapi.html
- MySQL binary log configuration: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- Debezium Docker images: https://hub.docker.com/r/debezium/connect

## Issues Found
1. **Event format missing envelope wrapper**: The JSON example under "Event Format (Kafka Message)" showed the `before`, `after`, `source`, `op`, and `ts_ms` fields at the top level. However, Debezium's default output wraps these inside a `payload` object (alongside a `schema` object). The Python consumer code correctly accessed fields via `event['payload']['op']`, creating an inconsistency with the JSON example. Fixed by wrapping the JSON example in the proper `{"schema": ..., "payload": {...}}` envelope structure to match both the actual Debezium output and the consumer code.

## Review Notes
- The `expire_logs_days` MySQL setting shown in the binary log configuration is deprecated in MySQL 8.0.11+ in favor of `binlog_expire_logs_seconds`. It still works in MySQL 8.0 but may be removed in a future release. Since the post targets MySQL 5.7+, this is acceptable but worth noting.
- The Docker `--link` flag used in the deployment section is a legacy Docker feature. Docker recommends user-defined networks instead. This is not incorrect but is worth noting for future updates.
- The Debezium connector configuration uses the correct 2.x property names (`topic.prefix`, `database.include.list`, `schema.history.internal.*`), which replaced the older 1.x names (`database.server.name`, `database.whitelist`, `database.history.*`).
- The MySQL user privileges listed (SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT) are correct per Debezium documentation.
