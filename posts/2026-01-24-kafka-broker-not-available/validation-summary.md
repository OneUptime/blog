# Validation Summary: How to Fix 'Broker May Not Be Available' Connection Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Java client
- kafka-python
- Confluent Kafka Docker images
- Docker Compose
- Kubernetes Services and StatefulSets
- SSL/TLS and SASL Kafka client configuration
- Prometheus alerting and Kafka JMX metrics
- Linux networking diagnostics

## Sources Consulted
- Apache Kafka KRaft operations documentation: https://kafka.apache.org/41/operations/kraft/
- Apache Kafka producer configuration reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka listener configuration documentation: https://kafka.apache.org/40/security/listener-configuration/
- Confluent Kafka listener configuration documentation: https://docs.confluent.io/platform/current/kafka/listeners.html
- kafka-python KafkaAdminClient documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaAdminClient.html
- kafka-python source for `describe_cluster()` return shape: https://raw.githubusercontent.com/dpkp/kafka-python/master/kafka/admin/_cluster.py
- Confluent Docker image documentation for ZooKeeper: https://hub.docker.com/r/confluentinc/cp-zookeeper

## Issues Found
- The bootstrap verification section used `kafka-metadata.sh --command brokers`, which is not a current Apache Kafka metadata tool. Replaced it with the documented `kafka-metadata-quorum.sh --bootstrap-server localhost:9092 describe --status` command for KRaft clusters and kept the ZooKeeper broker ID lookup for ZooKeeper-backed clusters.
- The Java producer diagnostic snippet used `log.connection.close`, which is a librdkafka-style setting, not an Apache Kafka Java producer config. Replaced it with the required Java producer key and value serializer settings.
- The Docker Compose example used `KAFKA_ZOOKEEPER_CONNECT` but did not define a ZooKeeper service and used an unpinned `latest` Kafka image. Added a matching `cp-zookeeper` service and pinned the Confluent images to `7.6.0` so the ZooKeeper-based example is internally consistent.
- The Python retry helper called `producer.bootstrap_connected()` but ignored its boolean result, so it could report success when no broker was connected. Added an explicit `NoBrokersAvailable` raise when the bootstrap connection check fails.
- The kafka-python health-check example treated broker metadata as objects with Java-style attributes (`nodeId`, `host`, `port`, `rack`). `KafkaAdminClient.describe_cluster()` returns dictionaries, so the broker access was changed to dictionary access.
- The Prometheus alert examples used metric names and a request timeout counter that are not Kafka's documented JMX metric names. Updated the examples to state that exporter mappings control Prometheus names, aligned the sample names with documented Kafka JMX metrics, and replaced the non-documented request timeout alert with a documented request latency metric.

## Review Notes
- The Kubernetes external listener example remains intentionally partial. Real production deployments usually need per-broker externally reachable advertised addresses rather than a single shared external address.
- Prometheus metric names still depend on the user's JMX exporter rules; the post now calls that out explicitly.
