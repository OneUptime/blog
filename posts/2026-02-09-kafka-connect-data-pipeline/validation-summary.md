# Validation Summary: How to Configure Kafka Connect on Kubernetes for Data Pipeline Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka Connect
- Confluent Platform Kafka Connect Docker images
- Confluent Hub connectors
- Kubernetes ConfigMaps, StatefulSets, Services, Jobs, and Secrets
- JDBC Source Connector
- Elasticsearch Sink Connector
- Kafka Connect REST API
- Prometheus JMX Exporter
- Kafka Connect dead letter queues

## Sources Consulted
- Apache Kafka Connect configuration reference: https://kafka.apache.org/26/configuration/kafka-connect-configs/
- Apache Kafka Connect user guide, including REST API and error handling: https://kafka.apache.org/35/kafka-connect/user-guide/
- Apache Kafka configuration providers documentation: https://kafka.apache.org/40/configuration/configuration-providers/
- Confluent Docker image configuration reference for Kafka Connect: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Kafka Connect REST API reference: https://docs.confluent.io/platform/7.9/connect/references/restapi.html
- Confluent Hub install command reference: https://docs.confluent.io/platform/7.2/connect/confluent-hub/command-reference/confluent-hub-install.html
- Confluent JDBC Source Connector configuration reference: https://docs.confluent.io/kafka-connectors/jdbc/current/source-connector/source_config_options.html
- Confluent Elasticsearch Sink Connector configuration reference: https://docs.confluent.io/kafka-connectors/elasticsearch/13.1/configuration_options.html
- Prometheus JMX Exporter rules documentation: https://prometheus.github.io/jmx_exporter/1.1.0/http-mode/rules/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes ConfigMap environment variable documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/

## Issues Found
- The Kafka Connect worker ConfigMap used `connect-distributed.properties`, but the Confluent `cp-kafka-connect` Docker entrypoint expects worker settings as `CONNECT_*` environment variables. Changed the ConfigMap to `CONNECT_*` keys and added `envFrom` in the StatefulSet.
- The connector examples used `${file:...}` secret substitutions without enabling Kafka Connect's file config provider. Added `CONNECT_CONFIG_PROVIDERS`, `CONNECT_CONFIG_PROVIDERS_FILE_CLASS`, and an allowed path for `/etc/kafka-connect/secrets`.
- The worker configuration included deprecated `internal.key.converter` and `internal.value.converter` settings. Removed them from the example.
- The JDBC source connector description said it streamed database changes, but `mode=incrementing` captures new rows based on an incrementing column, not arbitrary updates or deletes. Updated the wording to "new rows."
- The Elasticsearch sink connector included `type.name`, which is not part of the current self-managed connector configuration for Elasticsearch 7+ style indices. Removed the property.
- The JMX Exporter configuration used deprecated `whitelistObjectNames` and did not define the JMX target. Replaced it with `includeObjectNames` and added `hostPort: 127.0.0.1:9999`.
- The failure-handling example implied a JDBC source connector DLQ. Kafka Connect DLQs apply to sink connector processing errors, so the example topic was changed to `elasticsearch-sink-dlq` and the surrounding text now says to add the settings to sink connector configurations.
- The post described Kubernetes scaling as automatic. Adjusted the wording to horizontal scaling and Kubernetes scaling primitives, since automatic scaling requires an autoscaler configuration.

## Review Notes
- The examples are still illustrative and assume supporting resources exist, including the `kafka` namespace, Kafka brokers, referenced Kubernetes Secrets, connector-compatible database tables, and Elasticsearch.
- The connector deployment Job uses `POST /connectors`, which is correct for initial creation but will fail if the connector already exists. A future improvement could use `PUT /connectors/{name}/config` for idempotent updates.
