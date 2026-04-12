# Validation Summary: How to Use Debezium for MySQL Change Data Capture

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (binary logging, replication)
- Debezium 2.x (MySQL CDC connector)
- Apache Kafka / Kafka Connect
- Python (kafka-python consumer library)

## Sources Consulted
- Debezium MySQL Connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium event format documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-change-events-value
- Kafka Connect REST API: https://docs.confluent.io/platform/current/connect/references/restapi.html
- MySQL binary log configuration: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- kafka-python library documentation: https://kafka-python.readthedocs.io/en/master/

## Issues Found

### 1. `op` field incorrectly placed inside `source` object
- **What was wrong:** The example change event JSON placed the `op` field inside the `source` object. In Debezium's actual event format, `op` is a top-level field within the `payload` envelope, at the same level as `before`, `after`, and `source`.
- **What was changed:** Moved `op` out of `source` and placed it as a sibling of `before`, `after`, and `source` inside `payload`.
- **Why:** This matches the actual Debezium event structure as documented in the official Debezium documentation.

### 2. Missing `payload` envelope wrapper in event example
- **What was wrong:** The example JSON showed `before`, `after`, and `source` at the top level without a `payload` wrapper. However, the Python consumer code correctly accessed `event['payload']['op']`, making the example inconsistent with the consumer code.
- **What was changed:** Added the `schema` and `payload` envelope structure to the example event, and added a `ts_ms` field at the payload level (standard in Debezium events).
- **Why:** Debezium events use an envelope format with `schema` and `payload` top-level keys. The example now matches both the official format and the Python consumer code shown later in the post.

## Review Notes
- The `expire_logs_days` configuration parameter is deprecated in MySQL 8.0+ in favor of `binlog_expire_logs_seconds`. It still works in MySQL 8.0 but was removed in MySQL 8.4. The tutorial does not specify a MySQL version, so this is acceptable but worth noting for future updates.
- The replication user privileges are correct for basic operation. Depending on snapshot mode, `LOCK TABLES` may also be needed for the initial snapshot with a global read lock, but the listed privileges are sufficient for the default snapshot mode in recent Debezium versions.
- The connector configuration correctly uses Debezium 2.x property names (`topic.prefix`, `schema.history.internal.*`) rather than the deprecated 1.x names.
- The Kafka topic naming convention `myapp.myapp.orders` (topic.prefix.database.table) is correctly shown and consistently used between the explanation and the Python consumer code.
