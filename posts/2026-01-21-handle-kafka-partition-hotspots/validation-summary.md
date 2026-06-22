# Validation Summary: How to Handle Kafka Partition Hotspots

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- Kafka Java AdminClient and Producer APIs
- Kafka custom producer partitioners
- confluent-kafka-python
- Prometheus alerting rules and PromQL
- Kafka JMX metrics

## Sources Consulted
- Apache Kafka operations documentation, modifying topics: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka monitoring documentation, JMX metrics and `LogEndOffset`: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka Java `OffsetSpec` Javadoc: https://kafka.apache.org/32/javadoc/org/apache/kafka/clients/admin/OffsetSpec.html
- Apache Kafka Java `Partitioner` Javadoc: https://kafka.apache.org/39/javadoc/org/apache/kafka/clients/producer/Partitioner.html
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent Kafka Python producer overview: https://docs.confluent.io/kafka-clients/python/current/overview.html
- Confluent Kafka CLI tools documentation: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Confluent partition count guidance: https://docs.confluent.io/kafka/operations-tools/partition-determination.html
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The Java key-design example used `ThreadLocalRandom` without importing it. Added the missing import to keep the snippet syntactically complete.
- The Java detection report divided by zero when a topic had no retained messages. Guarded the coefficient-of-variation calculation when the average is zero.
- The Python detection tool called `get_watermark_offsets()` without an explicit timeout or cache behavior. Added `timeout=10` and `cached=False` so the snippet queries broker watermarks directly and avoids relying on stale cached values.
- The Java custom partitioners used `Arrays.hashCode()` for keyed records while describing the behavior as standard Kafka key partitioning. Replaced it with Kafka's Murmur2 hash via `Utils.toPositive(Utils.murmur2(keyBytes)) % numPartitions`.
- The Python custom producer's salted-key path did not update `partition_counts`, so the printed partition distribution omitted most of the simulated traffic. It now computes the salted-key partition, sends to that partition, and updates the counters.
- The Python custom producer treated an empty string key as `None` when sending. Updated the key handling so empty strings remain keyed records.
- The Python custom producer did not call `poll()` while producing, which can prevent delivery callbacks and queue service in confluent-kafka-python. Added `poll(0)` after produce calls.
- The Prometheus alert used `kafka_server_brokertopicmetrics_messagesinpersec` as if it had a `partition` label, but Kafka's `BrokerTopicMetrics` message-rate MBean is topic-level, not partition-level. Replaced the query with a per-partition `LogEndOffset` rate example based on Kafka's `kafka.log:type=Log,name=LogEndOffset,topic=...,partition=...` MBean.
- The key-migration Java snippet declared `final` fields without initializing them and omitted producer imports. Added imports and a constructor.
- The consumer-side remediation comment implied adding more consumers to the same hot partition can increase parallelism. Clarified that manual assignment can isolate hot partitions, but a single partition is still processed by only one consumer in a consumer group.

## Review Notes
- The Prometheus metric name `kafka_log_logendoffset` is a common JMX-exporter-style name, but exact Prometheus names depend on the JMX Exporter rules in use. The authoritative Kafka metric is the `kafka.log:type=Log,name=LogEndOffset,topic=...,partition=...` JMX MBean.
- Increasing a topic's partition count is supported, but it can change key-to-partition mapping for future records because keyed partitioning uses modulo partition count. The post's caution that it cannot be reversed is accurate.
