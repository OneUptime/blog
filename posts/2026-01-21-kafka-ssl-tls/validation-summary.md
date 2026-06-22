# Validation Summary: How to Secure Kafka with SSL/TLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- SSL/TLS
- OpenSSL
- Java keytool
- Java Kafka Producer and Consumer clients
- confluent-kafka Python client
- Docker Compose
- Confluent Platform Kafka Docker image

## Sources Consulted
- Apache Kafka SSL encryption and authentication documentation: https://kafka.apache.org/41/security/encryption-and-authentication-using-ssl/
- Apache Kafka listener configuration documentation: https://kafka.apache.org/35/security/listener-configuration/
- Apache Kafka generated broker configuration reference: https://kafka.apache.org/31/generated/kafka_config.html
- Confluent Platform Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Platform Docker image reference: https://docs.confluent.io/platform/current/installation/docker/image-reference.html
- Confluent librdkafka configuration reference: https://docs.confluent.io/platform/current/clients/librdkafka/html/md_CONFIGURATION.html
- confluent-kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Oracle keytool command documentation: https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html
- Local OpenSSL command help for `openssl req` and `openssl x509`

## Issues Found
- The confluent-kafka Python consumer configured an encrypted client private key path but omitted `ssl.key.password`. Added `ssl.key.password` to match the producer example and librdkafka's SSL private-key configuration.
- The Docker Compose example used `confluentinc/cp-kafka:7.5.0` with `KAFKA_ZOOKEEPER_CONNECT` but did not define a ZooKeeper service, so the snippet would not start as shown. Updated it to a current single-node KRaft configuration with `confluentinc/cp-kafka:8.3.0`.
- The updated Docker Compose snippet initially needed KRaft listener settings rather than ZooKeeper settings. Added `CLUSTER_ID`, `KAFKA_NODE_ID`, `KAFKA_PROCESS_ROLES`, `KAFKA_CONTROLLER_QUORUM_VOTERS`, `KAFKA_CONTROLLER_LISTENER_NAMES`, `KAFKA_INTER_BROKER_LISTENER_NAME`, and `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP`.
- The Docker Compose snippet needed single-node internal topic replication settings for a one-broker example. Added `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR`, `KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR`, and `KAFKA_TRANSACTION_STATE_LOG_MIN_ISR`.
- Avoided configuring both `inter.broker.listener.name` and `security.inter.broker.protocol` in the KRaft Docker example, because Kafka's broker configuration treats those as mutually exclusive.

## Review Notes
- The certificate-generation examples are suitable for development and demonstration. Production deployments should normally use an organizational CA or managed PKI, protect CA keys carefully, and validate certificate extensions and full chains.
- The Java SSL client snippets are technically valid partial examples, assuming the relevant Kafka client and serializer/deserializer imports are present.
- The Python and `openssl s_client` examples use PEM certificate paths, while the Java examples use JKS/PKCS12 keystores. That is technically valid, but future revisions could explain PEM export/conversion steps for readers who want to reuse the generated keytool artifacts with non-Java clients.
