# Validation Summary: How to Handle Consumer Group Rebalancing in Kafka

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Kafka consumer groups and rebalancing
- Kafka Java consumer client
- kafka-python
- Prometheus metrics and alerting rules
- Mermaid diagrams

## Sources Consulted
- Apache Kafka Consumer Configuration Reference: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka `ConsumerRebalanceListener` Javadocs: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html
- Apache Kafka KIP-429, Incremental Cooperative Rebalance Protocol: https://cwiki.apache.org/confluence/display/KAFKA/KIP-429%3A%2BKafka%2BConsumer%2BIncremental%2BRebalance%2BProtocol
- Apache Kafka KIP-345, Static Membership: https://cwiki.apache.org/confluence/display/KAFKA/KIP-345%3A%2BIntroduce%2Bstatic%2Bmembership%2Bprotocol%2Bto%2Breduce%2Bconsumer%2Brebalances
- kafka-python `KafkaConsumer` API docs: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html
- kafka-python upstream source for `CooperativeStickyAssignor`, `ConsumerRebalanceListener`, and `OffsetAndMetadata`: https://github.com/dpkp/kafka-python
- Confluent Kafka consumer group operations documentation: https://docs.confluent.io/kafka/operations-tools/manage-consumer-groups.html
- Prometheus histogram querying documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The post described all rebalances as stop-the-world. Updated the wording to distinguish eager rebalancing from cooperative rebalancing, where unaffected partitions can continue processing.
- Several Mermaid flowcharts used subgraph labels with spaces as node identifiers. Replaced them with explicit subgraph IDs and labels so the diagrams are valid Mermaid syntax.
- The kafka-python examples configured `partition_assignment_strategy` with the Java class-name string. Updated them to import and pass kafka-python's `CooperativeStickyAssignor` class.
- The kafka-python manual offset examples stored integer offsets where `commit()` expects `{TopicPartition: OffsetAndMetadata}`. Updated the examples to use `OffsetAndMetadata(offset + 1, '', -1)`.
- The Python async commit example cleared shared pending offsets without taking the existing lock and did not pass the tracked offsets to `commit_async()`. Updated it to copy and clear offsets under the lock, then commit the snapshot.
- The Java async commit example passed a mutable `pendingOffsets` map and cleared it immediately. Updated it to pass a snapshot map to `commitAsync()`.
- The static membership Python snippet imported `uuid` and called an undefined `get_hostname()`. Replaced it with `socket.gethostname()`.
- The max poll interval section omitted the static membership nuance. Added the caveat that static members delay partition reassignment until session timeout after exceeding `max.poll.interval.ms`.
- The heartbeat interval comments used a strict "less than session timeout divided by 3" rule while the official guidance is typically no higher than one third. Updated the comments accordingly.
- The Java `onPartitionsLost` comment said it was only for cooperative rebalancing. Updated it to describe unexpected partition loss, such as after a session timeout.
- The pause/resume section implied pausing alone avoids rebalances. Updated the wording to clarify that polling must continue to avoid exceeding `max_poll_interval_ms`.
- The Prometheus metrics example used `time.time()` without importing `time`. Added the missing import.
- The slow rebalance alert queried the base histogram metric name directly. Updated it to use `histogram_quantile()` over the histogram bucket series.
- The production checklist referenced `CooperativeStickyAssignor` and `hostname` without defining them. Added the required imports and hostname initialization.

## Review Notes
The Java cooperative assignor configuration is correct for Kafka clients, but existing deployments migrating from older eager assignors should follow Kafka's documented cooperative assignor rolling-upgrade path. The kafka-python cooperative assignor examples assume a current kafka-python release that includes `CooperativeStickyAssignor`.
