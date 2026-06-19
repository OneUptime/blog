# Validation Summary: How to Fix 'NetworkException' in Kafka

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Apache Kafka brokers and clients
- Kafka producer and consumer Java APIs
- Kafka CLI tools
- Docker Compose and Confluent Kafka container configuration
- Kubernetes StatefulSets
- Linux TCP/sysctl tuning
- JVM network properties
- log4j logging configuration

## Sources Consulted
- Apache Kafka 4.1 Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka 4.1 Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka 4.1 Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka 4.1 ProducerConfig Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/ProducerConfig.html
- Apache Kafka 4.1 ConsumerConfig Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerConfig.html
- Apache Kafka 4.1 KRaft Operations / Metadata tools: https://kafka.apache.org/41/operations/kraft/
- Confluent Docker Image Configuration Reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Kafka Listeners Explained: https://www.confluent.io/blog/kafka-listeners-explained/
- Linux sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/net.html
- Java networking properties documentation: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/doc-files/net-properties.html

## Issues Found
- The metadata inspection command used `kafka-metadata.sh --command "broker"`, which is not the current Kafka metadata inspection tool. Replaced it with `kafka-dump-log.sh --cluster-metadata-decoder --files ... | grep advertised`, with the ZooKeeper fallback kept for ZooKeeper-backed clusters.
- The Java debug logging snippet used `System.setProperty()` with logger names, which does not enable Kafka client DEBUG logging. Replaced it with logging-framework configuration text and the existing log4j logger configuration.
- The Kubernetes example set `KAFKA_BROKER_ID` from `metadata.name`, which produces values like `kafka-0` rather than the numeric broker ID Kafka expects. Replaced it with a container startup command that derives the numeric StatefulSet ordinal from `HOSTNAME`.
- The retry example imported Kafka's `TimeoutException`, causing the `future.get(... )` timeout catch to refer to the wrong exception type. Changed the catch clause to `java.util.concurrent.TimeoutException`.

## Review Notes
The remaining examples are technically valid as illustrative troubleshooting snippets, but production deployments should tune timeout, retry, socket, and sysctl values for their workload instead of copying the sample values directly. The Docker and Kubernetes snippets use Confluent's `cp-kafka:7.5.0`, which is valid for the shown environment-variable style but is version-specific.
