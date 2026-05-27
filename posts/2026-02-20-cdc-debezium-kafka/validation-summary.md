# Validation Summary: How to Implement Change Data Capture with Debezium and Kafka

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Change Data Capture
- Debezium PostgreSQL connector
- Apache Kafka
- Apache Kafka Connect
- Strimzi Kafka Operator
- Kubernetes
- PostgreSQL logical replication
- Python
- kafka-python
- Elasticsearch Python client
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Strimzi Deploying and Managing documentation: https://strimzi.io/docs/operators/latest/deploying.html
- Strimzi 0.45.2 downloads and supported Kafka versions: https://strimzi.io/downloads/
- Strimzi KafkaConnect build and plugin configuration reference: https://strimzi.io/docs/operators/in-development/full/configuring.html
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium PostgreSQL connector artifact on Maven Central: https://repo1.maven.org/maven2/io/debezium/debezium-connector-postgres/3.4.3.Final/
- PostgreSQL logical replication configuration documentation: https://www.postgresql.org/docs/current/logical-replication-config.html
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kafka-python KafkaConsumer API documentation: https://kafka-python.readthedocs.io/en/2.2.17/apidoc/KafkaConsumer.html
- Elasticsearch Python client API documentation: https://elasticsearch-py.readthedocs.io/en/stable/api/elasticsearch.html

## Issues Found
- The post installed Strimzi from the `latest` URL while using a ZooKeeper-based Kafka manifest. Current Strimzi releases removed support for ZooKeeper-based Kafka clusters, so the tutorial would fail against `latest`. I pinned the install command to Strimzi 0.45.2 and updated the Kafka and Kafka Connect versions to 3.9.2, which is supported by that Strimzi line.
- The Debezium PostgreSQL connector archive referenced version 2.6.0.Final, which is outdated. I updated the plugin URL to the current 3.4.3.Final archive and verified that the artifact exists.
- The Kafka Connect ServiceMonitor snippet assumed the Prometheus metrics port existed, but the KafkaConnect resource did not enable Strimzi JMX Prometheus metrics. I added a minimal `metricsConfig` reference and the corresponding ConfigMap.
- The Elasticsearch Python client example used `ignore=[404]` on `delete()`, but the current generated client method does not expose `ignore` on the API call. I changed it to `es.options(ignore_status=404).delete(...)`.

## Review Notes
The tutorial now remains intentionally ZooKeeper-based by pinning to Strimzi 0.45.2. A future rewrite should migrate the Kafka deployment to KRaft and current Strimzi `v1` resources instead of using the last ZooKeeper-compatible Strimzi line.
