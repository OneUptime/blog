# Validation Summary: How to Troubleshoot Kafka Connect Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Connect REST API
- Kafka Connect connector configuration
- Kafka Connect error handling and dead letter queues
- Kafka Connect JMX metrics
- Java
- Python
- Confluent JDBC Source Connector
- Confluent Elasticsearch Sink Connector

## Sources Consulted
- Apache Kafka Connect Administration: https://kafka.apache.org/42/kafka-connect/administration/
- Apache Kafka generated sink connector configuration reference: https://kafka.apache.org/32/generated/sink_connector_config.html
- Confluent Kafka Connect REST API reference: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Confluent Kafka Connect monitoring/JMX metrics documentation: https://docs.confluent.io/platform/current/connect/monitoring.html
- Confluent JDBC Source Connector configuration reference: https://docs.confluent.io/kafka-connectors/jdbc/current/source-connector/source_config_options.html
- Confluent Elasticsearch Sink Connector configuration reference: https://docs.confluent.io/kafka-connectors/elasticsearch/current/configuration_options.html
- Confluent Cloud JDBC source connector documentation for current `table.include.list` naming: https://docs.confluent.io/cloud/current/connectors/cc-oracle-db-source.html

## Issues Found
- The task state table omitted `UNASSIGNED`. Added it because Kafka Connect documents `UNASSIGNED`, `RUNNING`, `PAUSED`, and `FAILED` as possible connector/task states.
- The connector state table described `UNASSIGNED` as "Connector tasks not assigned". Changed it to "Connector has not yet been assigned to a worker" to match Kafka Connect status semantics.
- The Java JMX example queried `connector-task-metrics` while checking error and DLQ metrics. Changed it to query `task-error-metrics`, where `total-record-errors` and `deadletterqueue-produce-requests` are actually exposed.
- The Python health checker treated connectors as healthy when tasks were `PAUSED`, `UNASSIGNED`, or another non-running state. Updated the classification so only all-running tasks are counted as healthy.
- The JDBC source connector example used `table.whitelist`. Updated it to `table.include.list`, the current property name in newer Confluent Cloud JDBC connector documentation.
- The Elasticsearch sink connector example included `type.name`, which is not present in the current Confluent Elasticsearch Sink Connector configuration reference for Elasticsearch 7+ support. Removed it.
- The out-of-memory snippet said to put `KAFKA_HEAP_OPTS` in `connect-distributed.properties`. Changed the instruction to set it before starting the Connect worker because it is an environment variable, not a Connect worker property.

## Review Notes
- The REST API examples for listing connectors, connector status, connector configuration, task restart, connector restart, pause, resume, and plugin listing match the current Kafka Connect REST API shape.
- The error handling properties `errors.tolerance`, `errors.log.enable`, `errors.log.include.messages`, `errors.retry.timeout`, `errors.retry.delay.max.ms`, and sink DLQ settings are valid Kafka Connect connector properties.
- `errors.tolerance=all` and DLQ settings are useful for record-level errors, but they can hide bad data if used without alerting and DLQ review.
