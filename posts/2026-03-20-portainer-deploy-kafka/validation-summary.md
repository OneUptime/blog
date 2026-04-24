# Validation Summary: How to Deploy Kafka via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- KRaft
- Portainer
- Docker Compose / Portainer Stacks
- Kafka UI
- Python
- kafka-python

## Sources Consulted
- Apache Kafka 3.3 upgrade notes: https://kafka.apache.org/33/getting-started/upgrade/
- Apache Kafka 3.7 KRaft operations docs: https://kafka.apache.org/37/operations/kraft/
- Apache Kafka 3.7 broker configuration docs: https://kafka.apache.org/37/configuration/broker-configs/
- Apache Kafka 3.7 quick start: https://kafka.apache.org/37/getting-started/quickstart/
- Apache Kafka 3.7 `LogDirsCommand` source: https://raw.githubusercontent.com/apache/kafka/3.7/tools/src/main/java/org/apache/kafka/tools/LogDirsCommand.java
- Bitnami Kafka container README: https://github.com/bitnami/containers/blob/main/bitnami/kafka/README.md
- Kafka UI configuration docs: https://docs.kafka-ui.provectus.io/configuration/configuration-file
- Kafka UI configuration wizard docs: https://docs.kafka-ui.provectus.io/configuration/configuration-wizard
- kafka-python usage docs: https://kafka-python.readthedocs.io/en/2.1.5/usage.html
- kafka-python producer API docs: https://kafka-python.readthedocs.io/en/2.1.5/apidoc/KafkaProducer.html
- kafka-python consumer API docs: https://kafka-python.readthedocs.io/en/2.1.5/apidoc/KafkaConsumer.html

## Issues Found
- The introduction said Kafka 3.3 "eliminates" ZooKeeper without noting the version significance. I corrected it to match Apache Kafka's 3.3 documentation, which marks KRaft as production-ready for new clusters.
- The single-node stack omitted `KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR=1`. On a one-broker cluster, Kafka's default offsets-topic replication factor is 3, so consumer-group offset topic creation can fail. I added the setting.
- The stack published `9092:9092` even though the article's host-side clients use the separate `EXTERNAL` listener on `9094`. I removed the `9092` host mapping to avoid exposing an internal listener that is not meant for external clients in this layout.
- The Python consumer example did not set a `group_id`, but the monitoring section later tells readers to inspect `my-consumer-group`. I added `group_id='my-consumer-group'` so the examples line up.
- The monitoring section described `kafka-log-dirs.sh` as checking broker metrics. The Kafka tool queries log directory usage, not general broker metrics, so I corrected that wording.
- The conclusion claimed the persistent volume "ensures" no message loss during updates. That overstates what persistence guarantees, especially in a single-node example with replication factor 1. I changed it to say the volume helps preserve broker data across restarts and updates.

## Review Notes
- This is a single-node combined controller/broker deployment. Apache Kafka's KRaft docs describe combined mode as simpler for small use cases, but not recommended for critical deployment environments.
- The external listener is advertised as `localhost:9094`, which is correct only when clients run on the Docker host itself. If readers connect from another machine, they must advertise a reachable host/IP instead.
- The post is pinned to `bitnami/kafka:3.7`. If that image tag is updated later, the environment variables and container guidance should be revalidated against the newer Bitnami docs.
