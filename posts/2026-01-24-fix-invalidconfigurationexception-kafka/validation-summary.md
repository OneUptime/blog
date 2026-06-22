# Validation Summary: How to Fix 'InvalidConfigurationException' in Kafka

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Java producer and consumer clients
- Kafka broker configuration
- Kafka CLI tools
- SSL/TLS and SASL client configuration
- Spring Boot Kafka configuration
- Java

## Sources Consulted
- Apache Kafka Producer Configuration Reference: https://kafka.apache.org/43/configuration/producer-configs/
- Apache Kafka Consumer Configuration Reference: https://kafka.apache.org/43/configuration/consumer-configs/
- Apache Kafka Broker Configuration Reference: https://kafka.apache.org/43/configuration/broker-configs/
- Apache Kafka Basic Kafka Operations: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka InvalidConfigurationException Javadoc: https://kafka.apache.org/0110/javadoc/org/apache/kafka/common/errors/InvalidConfigurationException.html
- Spring Boot KafkaProperties API: https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/autoconfigure/kafka/KafkaProperties.html

## Issues Found
- The post treated client-side configuration validation failures as `InvalidConfigurationException` only. Kafka producer configuration conflicts, such as explicitly enabling idempotence with incompatible settings, are documented as client-side `ConfigException` cases. Updated the introduction, validation diagram, section heading, and summary wording to cover `InvalidConfigurationException` and related client-side configuration errors accurately.
- The transactional producer example said `enable.idempotence` was a missing required setting. Current Kafka producer documentation states that `transactional.id` implies idempotence. Changed the incorrect example to explicitly set `enable.idempotence=false`, and updated the correct example and reference card to say idempotence is implied and must not be disabled.
- The validation utility incorrectly rejected a transactional producer unless `enable.idempotence=true` was explicitly present. Changed the check so it only rejects an explicit `enable.idempotence=false`.
- The validation utility described `retries > 0` as an idempotence requirement but did not check it. Added a retries validation check for explicit idempotence.
- The SSL "wrong" example claimed that a missing `ssl.truststore.password` is a configuration error. Kafka documents the truststore password as optional; omitting it disables integrity checking for the truststore. Changed the example to a JKS keystore with missing `ssl.keystore.password`, which is required when `ssl.keystore.location` is configured.
- The Spring Boot Java snippet used `ProducerConfig`, `Map`, `List`, and `Collections` without importing them. Added the missing imports.

## Review Notes
- The post does not pin a Kafka version. The reviewed corrections align with current Apache Kafka 4.3 documentation as available on 2026-06-19.
- Kafka's newer consumer group protocol changes how heartbeat and session timeout settings are controlled. The post's consumer examples remain valid for the classic group protocol, which is Kafka's documented default in the consulted version.
