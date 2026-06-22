# Validation Summary: How to Tune Kafka Producer Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka producer configuration
- Kafka Java producer API
- Kafka producer metrics
- Java serialization for Kafka records

## Sources Consulted
- Apache Kafka Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka Producer Metrics: https://kafka.apache.org/32/generated/producer_metrics.html
- Apache Kafka KafkaProducer Javadoc: https://kafka.apache.org/10/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka ByteArraySerializer Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/common/serialization/ByteArraySerializer.html
- Apache Kafka StringSerializer Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/common/serialization/StringSerializer.html

## Issues Found
- The `linger.ms` comment said the default was `0ms`. Current Apache Kafka documentation lists the default as `5ms` in Kafka 4.0 and later, so the comment was updated.
- The compression table described `none` as suitable for testing only. No compression is also valid for low-latency or CPU-bound workloads, so the recommendation was corrected.
- The high-throughput configuration used `acks=1` and `max.in.flight.requests.per.connection=10`, which conflict with idempotence. Since idempotence is enabled by default when there are no conflicting settings, the example now explicitly disables idempotence for that speed-focused profile.
- The reliable configuration comment described idempotence as "exactly-once." Idempotence prevents duplicate writes during retries, while broader exactly-once processing requires additional transactional semantics, so the comment was narrowed.
- The synchronous send heading said "Guaranteed Order," which was too broad because ordering guarantees depend on partitioning and send pattern. It was changed to "Blocking Send."
- The benchmark sends `byte[]` values but could be called with configurations that used `StringSerializer` for values. The benchmark now sets `ByteArraySerializer` for values and `StringSerializer` for keys before constructing the producer.

## Review Notes
The post is technically relevant and the remaining examples use current Kafka producer configuration keys and Java producer APIs. The performance tables are directional guidance; exact throughput, latency, and compression ratios remain workload-dependent.
