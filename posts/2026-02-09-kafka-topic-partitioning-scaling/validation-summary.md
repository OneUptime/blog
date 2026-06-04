# Validation Summary: How to Configure Kafka Topic Partitioning for Horizontal Scaling on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka topics, partitions, producers, consumers, and consumer groups
- Kafka Java client APIs
- Kafka CLI topic administration
- Kubernetes Deployments, Jobs, ConfigMaps, lifecycle hooks, and Horizontal Pod Autoscaler
- Prometheus Operator ServiceMonitor and PromQL-style metrics

## Sources Consulted
- Apache Kafka documentation: Basic Kafka Operations and topic creation examples: https://kafka.apache.org/40/operations/basic-kafka-operations/
- Apache Kafka documentation: Topic configs including `retention.ms`, `segment.bytes`, `compression.type`, and `min.insync.replicas`: https://kafka.apache.org/43/configuration/topic-configs/
- Apache Kafka Javadocs: `Partitioner`: https://kafka.apache.org/39/javadoc/org/apache/kafka/clients/producer/Partitioner.html
- Apache Kafka Javadocs: `KafkaConsumer`, offsets, `poll(Duration)`, `commitSync`, `commitAsync`, and `wakeup()`: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka Javadocs: `ConsumerRebalanceListener`: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html
- Kubernetes API reference: `autoscaling/v2` HorizontalPodAutoscaler: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes documentation: Horizontal Pod Autoscaling concepts and custom metrics: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes documentation: Container lifecycle hooks and `preStop`: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks
- Prometheus Operator API reference: `ServiceMonitor`: https://prometheus-operator.dev/docs/api-reference/api/
- Confluent guidance by Kafka co-creator Jun Rao on choosing partition counts by throughput: https://www.confluent.io/blog/how-choose-number-topics-partitions-kafka-cluster/
- GitHub profile link for the author: https://github.com/nawazdhandala

## Issues Found
- Clarified that same-key records map to the same partition only while the partition count and partitioning strategy remain unchanged. This matters because increasing partitions changes modulo-based key mapping for new records.
- Changed the consumer-group wording from "exactly one consumer" to "at most one consumer" per partition at a time, which matches Kafka's assignment behavior more precisely.
- Fixed the custom partitioner example to avoid `Math.abs(...) % partitions`, which can produce a negative value for `Integer.MIN_VALUE`. The example now uses Kafka's `Utils.toPositive(...)`.
- Corrected the null-key partitioner comment and implementation from a non-round-robin `Math.random()` example to explicit random distribution with `ThreadLocalRandom`.
- Updated the consumer Deployment scaling comments and HPA `maxReplicas` to avoid implying useful active consumers above the partition count and to match the later 40-partition example.
- Updated the consumer shutdown example to catch `WakeupException`, commit final offsets, and close the consumer after `wakeup()` interrupts `poll(Duration)`.
- Expanded the lifecycle hook YAML so `preStop` is shown in valid Deployment context and added `terminationGracePeriodSeconds` to allow the hook plus application shutdown time to complete.
- Updated the partition-increase note to mention that existing data is not redistributed and keyed message partition mapping can change for new messages.
- Changed the hotspot salting example from deterministic salting of every key to random salting for hot keys only when strict per-key ordering is not required.
- Replaced the broad recommendation to use compacted topics for high-cardinality keys with the more accurate guidance to use compaction for latest-value or changelog-style data.

## Review Notes
The remaining snippets are examples and assume surrounding application code, dependencies, metrics exporters, and Prometheus adapter configuration exist. The `ServiceMonitor` example is structurally valid for Prometheus Operator, but it still requires a Kubernetes `Service` exposing a port named `metrics`.
