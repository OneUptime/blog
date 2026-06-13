# Validation Summary: How to Handle Rebalancing in Kafka Consumer Groups

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka consumer groups
- Kafka Java client
- Consumer rebalancing protocols
- Static group membership
- Kafka consumer configuration
- Kafka consumer metrics and Prometheus-style alerting

## Sources Consulted
- Apache Kafka Consumer Configuration Reference: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka KafkaConsumer Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka ConsumerRebalanceListener Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html
- Apache Kafka CooperativeStickyAssignor Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/CooperativeStickyAssignor.html
- Apache Kafka Monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka KIP-345 static membership proposal: https://cwiki.apache.org/confluence/display/KAFKA/KIP-345%3A%2BIntroduce%2Bstatic%2Bmembership%2Bprotocol%2Bto%2Breduce%2Bconsumer%2Brebalances
- Apache Kafka KIP-429 incremental rebalance proposal: https://cwiki.apache.org/confluence/x/vAclBg

## Issues Found
- The introduction said consumption stops during rebalancing without qualification. Updated it to distinguish eager rebalancing, where the group pauses, from cooperative rebalancing, where only partitions that need to move are revoked.
- The Java snippets that instantiate `KafkaConsumer<String, String>` omitted required key and value deserializer configuration. Added `StringDeserializer` properties so the examples can construct a consumer successfully.
- The rebalance listener used `Map<TopicPartition, Long>` with `consumer.commitSync(currentOffsets)`, but Kafka's offset commit API expects `Map<TopicPartition, OffsetAndMetadata>`. Updated the map type to `OffsetAndMetadata`.
- The `onPartitionsLost` comment implied this callback runs on a crashed consumer. Reworded it because the callback is for partitions lost without a normal revoke; a crashed process cannot execute its listener.

## Review Notes
- The Prometheus metric names are exporter-dependent. The Kafka Java client exposes the underlying rebalance metrics through Kafka metrics/JMX, but production Prometheus names may differ depending on the JMX exporter or client metrics bridge configuration.
- Static membership reduces rebalances for transient unavailability when the consumer rejoins within the session timeout; longer session timeouts also delay reassignment when a member is truly gone.
