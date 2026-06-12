# Validation Summary: How to Implement Kafka Consumer Group Rebalancing

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Apache Kafka consumer groups
- Kafka Java client
- Kafka consumer partition assignment strategies
- Kafka static membership
- KafkaJS
- Kubernetes StatefulSet configuration
- Prometheus-style alerting
- OneUptime observability integration

## Sources Consulted
- Apache Kafka 4.1 Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka ConsumerRebalanceListener Javadocs: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html
- Apache Kafka CooperativeStickyAssignor Javadocs: https://kafka.apache.org/36/javadoc/org/apache/kafka/clients/consumer/CooperativeStickyAssignor.html
- Apache Kafka ConsumerPartitionAssignor Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerPartitionAssignor.html
- Apache Kafka KafkaConsumer Javadocs for pattern subscription behavior: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- KafkaJS consuming documentation: https://kafka.js.org/docs/consuming
- KafkaJS instrumentation events documentation: https://kafka.js.org/docs/instrumentation-events
- OneUptime product/documentation pages and npm registry lookup for `@oneuptime/sdk`

## Issues Found
- The eager assignor example described RangeAssignor as simply the default assignor. Updated the comment to clarify that current Kafka clients default to `[RangeAssignor, CooperativeStickyAssignor]`, with RangeAssignor used first, and that RangeAssignor itself uses eager rebalancing.
- The cooperative rebalance listener incorrectly said `onPartitionsLost` was added by the cooperative protocol and was called for partitions not being revoked. Updated it to match Kafka's callback semantics: it is invoked when partitions are lost without graceful revocation, such as after session timeout or fatal group errors.
- The comparison section stated rebalance duration as `O(total partitions)` vs `O(moved partitions)`, which is an oversimplified complexity claim. Replaced it with accurate statements about processing impact.
- The static membership example used a five-minute session timeout without noting broker-side limits. Added a comment that `session.timeout.ms` must be within the broker's configured `group.min.session.timeout.ms` and `group.max.session.timeout.ms`.
- The custom assignor section used Kafka's helper base class without caveat. Added a note that production assignors should implement `ConsumerPartitionAssignor` directly and that the shown class is a simplified example.
- The KafkaJS section incorrectly claimed cooperative sticky assignment was the KafkaJS default and showed an empty `partitionAssigners` array. Updated it to KafkaJS's documented default `PartitionAssigners.roundRobin` and removed the empty assigner override.
- The KafkaJS static membership example used an undocumented `groupInstance` option and referenced `consumer.groupInstance`. Replaced it with a caveat that KafkaJS does not document a `group.instance.id` static membership option and showed dynamic membership settings instead.
- The Kafka consumer metrics comments used non-official metric names. Replaced them with the relevant Kafka JMX MBean names and attributes.
- The Prometheus alerting snippet implied fixed metric names. Added a note that metric names vary by JMX exporter or instrumentation pipeline.
- The OneUptime integration snippet referenced a non-existent `@oneuptime/sdk` npm package and an unverified `trackEvent` API. Replaced it with a structured-event example suitable for an existing log or metric pipeline collected by OneUptime.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Several Java snippets remain illustrative and omit imports, helper method implementations, and production error handling, which is acceptable for a guide but should be made explicit if the post is later converted into copy-paste runnable examples.
