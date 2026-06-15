# Validation Summary: How to Stream Data with Kafka Connect

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Connect distributed workers
- Kafka Connect REST API
- Kafka Connect Single Message Transforms
- Debezium PostgreSQL connector
- Confluent Elasticsearch Sink connector
- Kafka Connect dead letter queues
- JMX metrics and Prometheus JMX Exporter

## Sources Consulted
- Apache Kafka Connect administration documentation: https://kafka.apache.org/42/kafka-connect/administration/
- Apache Kafka configuration providers documentation: https://kafka.apache.org/40/configuration/configuration-providers/
- Confluent Kafka Connect worker configuration reference: https://docs.confluent.io/platform/current/connect/references/allconfigs.html
- Confluent Kafka Connect REST API reference: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Confluent Kafka Connect monitoring documentation: https://docs.confluent.io/platform/current/connect/monitoring.html
- Confluent Kafka sink connector error handling configuration reference: https://docs.confluent.io/platform/current/installation/configuration/connect/sink-connect-configs.html
- Confluent Elasticsearch Sink connector configuration reference: https://docs.confluent.io/kafka-connectors/elasticsearch/current/configuration_options.html
- Confluent Kafka Connect Filter SMT reference: https://docs.confluent.io/kafka-connectors/transforms/current/filter-ak.html
- Confluent Debezium PostgreSQL Source connector documentation: https://docs.confluent.io/kafka-connectors/debezium-postgres-source/current/overview.html
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium installation documentation: https://debezium.io/documentation/reference/stable/install.html

## Issues Found
- The worker configuration used `${file:...}` secret placeholders in connector configs but did not configure the `FileConfigProvider`. Added `config.providers=file` and `config.providers.file.class=org.apache.kafka.common.config.provider.FileConfigProvider` so the placeholders resolve correctly.
- The Debezium installation command used the older `confluent-hub install` form. Updated it to Confluent's current `confluent connect plugin install` command.
- The manual Debezium download command pinned an old `2.4.0.Final` PostgreSQL connector archive. Updated it to the current stable Debezium `3.5.0.Final` archive and matching extraction command.
- The Elasticsearch sink configuration included `type.name`, which has been removed from the current Confluent Elasticsearch Sink connector configuration. Removed it.
- The Elasticsearch sink configuration used lowercase values for options whose current documented valid values are uppercase for `behavior.on.null.values` and `write.method`. Changed them to `DELETE` and `UPSERT`.
- The Elasticsearch sink configuration used `RegexRouter` to mutate topic names without enabling synchronous flushes. Added `flush.synchronously=true`, which Confluent documents as required for topic-mutating SMTs such as `RegexRouter`.
- The scaling section stated that active sink tasks will not exceed the number of source topic partitions. Reworded it to the more precise point that sink connector useful parallelism is bounded by the partitions available to assign.

## Review Notes
- The post remains a general Kafka Connect tutorial rather than a complete production hardening guide. Real deployments should also account for connector version compatibility with the Kafka Connect runtime, PostgreSQL logical replication privileges, internal topic cleanup policies if pre-created manually, worker authentication/TLS, and connector-specific retry/backoff tuning.
