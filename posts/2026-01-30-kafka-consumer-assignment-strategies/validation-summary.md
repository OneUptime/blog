# Validation Summary: How to Implement Kafka Consumer Assignment Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka consumer groups and partition assignment strategies
- Kafka Java client
- kafka-python
- Spring Boot Kafka configuration
- KafkaJS
- Confluent Kafka Python client / librdkafka
- confluent-kafka-go
- Kafka CLI and JMX metrics

## Sources Consulted
- Apache Kafka Consumer Configuration: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka RangeAssignor Javadoc: https://kafka.apache.org/24/javadoc/org/apache/kafka/clients/consumer/RangeAssignor.html
- Apache Kafka CooperativeStickyAssignor Javadoc: https://kafka.apache.org/24/javadoc/org/apache/kafka/clients/consumer/CooperativeStickyAssignor.html
- Apache Kafka KIP-429: https://cwiki.apache.org/confluence/display/KAFKA/KIP-429%3A+Kafka+Consumer+Incremental+Rebalance+Protocol
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/1.2.5/apidoc/KafkaConsumer.html
- KafkaJS consuming documentation: https://kafka.js.org/docs/consuming
- Spring Kafka message listener container documentation: https://docs.spring.io/spring-kafka/reference/kafka/receiving-messages/message-listener-container.html
- librdkafka configuration documentation: https://docs.confluent.io/platform/current/clients/librdkafka/html/md_CONFIGURATION.html
- Confluent Kafka Go client overview: https://docs.confluent.io/kafka-clients/go/current/overview.html
- Confluent consumer metrics documentation: https://docs.confluent.io/cloud/current/client-apps/consumer-metrics.html

## Issues Found
- The kafka-python example passed a string path for `partition_assignment_strategy`. kafka-python documents this as a list of assignor objects/classes, so the example now imports and passes `RangePartitionAssignor`.
- The RangeAssignor imbalance example for 2 topics, 4 partitions, and 3 consumers overstated Consumer 2's assignment and said Consumer 3 received nothing extra. It now shows the correct range result: Consumer 1 gets two partitions per topic, while Consumers 2 and 3 get one partition per topic.
- The KafkaJS section incorrectly claimed KafkaJS uses StickyAssignor by default and is sticky-like. KafkaJS documentation states that round robin is the default and exposes round robin as the built-in assigner, so the section now says KafkaJS does not provide Kafka's built-in StickyAssignor out of the box.
- Cooperative rebalancing was described as "zero-downtime" or fully continuous. This was narrowed to "low-disruption" and "unaffected partitions keep processing," which matches KIP-429's incremental cooperative behavior.
- The eager-to-cooperative Java migration example listed `CooperativeStickyAssignor` before `StickyAssignor` during the temporary mixed configuration. KIP-429's rolling migration keeps the eager assignor first, so the example now uses `StickyAssignor, CooperativeStickyAssignor` before removing `StickyAssignor`.
- The heartbeat tuning comment said the heartbeat interval should be strictly less than one third of the session timeout, while the example used exactly one third. The wording now matches Kafka guidance that it should typically be no higher than one third.

## Review Notes
The post is technically relevant and suitable as a Kafka consumer assignment guide after the corrections. The current Kafka Java client default is a list beginning with `RangeAssignor` and including `CooperativeStickyAssignor`, so the post now avoids implying that RangeAssignor is the only configured default.
