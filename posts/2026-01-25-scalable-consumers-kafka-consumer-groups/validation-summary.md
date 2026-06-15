# Validation Summary: How to Build Scalable Consumers with Kafka Consumer Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka consumer groups
- Kafka Java client
- Kafka partition assignment strategies
- Kafka consumer rebalancing
- Kafka command-line tools
- Kubernetes HorizontalPodAutoscaler

## Sources Consulted
- Apache Kafka Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka Basic Kafka Operations: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka KafkaConsumer JavaDoc: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka CooperativeStickyAssignor JavaDoc: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/CooperativeStickyAssignor.html
- Confluent Kafka Consumer Design: https://docs.confluent.io/kafka/design/consumer-design.html
- Confluent Kafka Consumer JavaDoc: https://docs.confluent.io/platform/current/clients/javadocs/javadoc/org/apache/kafka/clients/consumer/Consumer.html
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://docs.okd.io/latest/rest_api/autoscale_apis/horizontalpodautoscaler-autoscaling-v2.html

## Issues Found
- The post said partition assignment ensures no duplicate processing. Kafka assigns each partition to exactly one consumer in a group at a time, but duplicate processing can still happen after failures or retries with at-least-once offset commits. Updated the wording to say consumers in the same group do not process the same partition concurrently.
- The post said adding a fourth consumer to six partitions redistributes partitions evenly. With six partitions and four consumers, assignment is balanced as evenly as possible, not exactly even. Updated the wording.
- The `ConsumerRebalanceListener` example used `Map<TopicPartition, Long>` with `consumer.commitSync(currentOffsets)`. Kafka's commit APIs require `Map<TopicPartition, OffsetAndMetadata>`. Updated the import, map type, and tracked offset value.
- The long-running processing section implied `pause()` alone prevents `max.poll.interval.ms` violations. Kafka requires the consumer thread to keep calling `poll()` within `max.poll.interval.ms`; `pause()` only stops fetching more records for paused partitions. Updated the text to scope the example to work that completes within the interval and added guidance for moving longer work to another thread or increasing the interval.

## Review Notes
The remaining examples use current Kafka Java client APIs and documented Kafka CLI options. The Kubernetes HPA example uses a valid `autoscaling/v2` external metric shape, assuming a cluster metrics adapter exposes `kafka_consumergroup_lag` with matching labels.
