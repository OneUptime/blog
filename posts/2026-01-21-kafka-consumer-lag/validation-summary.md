# Validation Summary: How to Handle Kafka Consumer Lag

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka consumer groups and offsets
- Kafka Java Admin API
- Confluent Kafka Python client
- Kafka command-line tools
- kafka-lag-exporter
- Prometheus and PromQL alerting
- Kubernetes Deployments and HorizontalPodAutoscaler
- Java consumer throughput and processing patterns

## Sources Consulted
- Apache Kafka Basic Operations documentation: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka Admin API Javadoc: https://kafka.apache.org/36/javadoc/org/apache/kafka/clients/admin/Admin.html
- Apache Kafka ListConsumerGroupOffsetsSpec Javadoc: https://kafka.apache.org/34/javadoc/org/apache/kafka/clients/admin/ListConsumerGroupOffsetsSpec.html
- Apache Kafka Consumer Javadoc for committed offset semantics: https://kafka.apache.org/0100/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- kafka-lag-exporter upstream repository and examples: https://github.com/seglo/kafka-lag-exporter

## Issues Found
- The lag definition and diagram treated the log end offset as the latest record offset. Kafka log end offset is the next offset after the last record, and committed offsets represent the next record to consume, so the formula example was off by one. Updated the definition and example to use log end offset 10 with committed offset 5, giving lag 5.
- The "Consumer Lag" type described total lag for a consumer rather than a consumer group. Updated the wording to consumer group.
- The Java Admin examples used `AdminClient` as the field type and factory. Updated them to the current `Admin` interface and `Admin.create(...)`.
- The Python lag monitor accessed `self.admin._conf`, a private/internal field that is not part of the documented Confluent Kafka Python API. Stored `bootstrap_servers` directly and used it when creating the temporary consumer.
- The Python lag monitor included invalid committed offsets in calculations. Added `OFFSET_INVALID` handling so uncommitted partitions are skipped.
- The kafka-lag-exporter Kubernetes example was not a valid `apps/v1` Deployment because it lacked a selector and matching pod template labels, and the environment variable configuration did not match the upstream standalone HOCON example. Replaced it with a ConfigMap-mounted `application.conf`, a valid selector/template label pair, and the upstream Docker image/startup convention.
- The custom Java exporter referenced `TopicPartition` without importing it. Added the missing import.
- The Prometheus growing-lag alert used `rate()` on a gauge. Prometheus documents `rate()` for counters and `deriv()` for gauges, so the expression now uses `deriv(kafka_consumer_lag[5m])`.
- The stalled-consumer alert used `increase()` on a gauge and claimed to prove no progress. Replaced it with `changes(...) == 0` and updated the alert text to accurately describe unchanged non-zero lag.
- A diagnostic command comment said `kafka-broker-api-versions.sh` checks broker metrics. Updated it to say it checks broker API versions.
- The Java profiling snippet used placeholder `Timer` and `Counter` classes as if they were standard Java types. Updated it to use Micrometer `Timer`, `Counter`, and `MeterRegistry` APIs.
- The parallel partition processing example only started workers for partition IDs from `0` to `parallelism - 1`, leaving other partition IDs unprocessed. Updated it to create a single-thread executor per observed partition, preserving per-partition order.
- The catch-up example computed `pollRecords` but never used it. Replaced the unused variable with a note that `max.poll.records` must be configured before a catch-up run.
- The Kubernetes HPA example omitted required target and replica bounds. Added `metadata.name`, `scaleTargetRef`, `minReplicas`, and `maxReplicas`.

## Review Notes
Some Java snippets remain intentionally illustrative where they depend on application-specific components such as database clients, HTTP clients, or business processing methods. The Kafka-specific APIs, CLI flags, PromQL functions, and Kubernetes resource shapes were checked and corrected.
