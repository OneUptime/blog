# Validation Summary: How to Implement Kafka Rack Awareness

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka broker rack awareness
- Apache Kafka Admin API
- Kafka command-line tools
- Confluent Kafka Python client
- Strimzi Operator
- Kubernetes node labels and pod anti-affinity
- Kafka consumer closest-replica fetching
- Prometheus alerting

## Sources Consulted
- Apache Kafka 4.1 Basic Operations: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka 4.1 Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka 4.1 Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka 4.1 Admin API Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/Admin.html
- Apache Kafka Protocol documentation: https://kafka.apache.org/protocol/
- Strimzi Operator rack awareness documentation: https://strimzi.io/docs/operators/latest/configuring.html
- Confluent Kafka Python client metadata documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/_modules/confluent_kafka/admin/_metadata.html
- librdkafka configuration documentation: https://docs.confluent.io/platform/current/clients/librdkafka/html/md_CONFIGURATION.html
- Red Hat explanation of Apache Kafka 2.4 closest-replica fetching: https://developers.redhat.com/blog/2020/04/29/consuming-messages-from-closest-replicas-in-apache-kafka-2-4-0-and-amq-streams

## Issues Found
- The opening claim said rack awareness prevents a rack failure from causing data loss or unavailability. Changed it to "reduces the risk" because availability and durability also depend on replication factor, ISR state, producer acknowledgments, and the number of surviving replicas.
- The Java examples used `AdminClient` as the field type and factory. Updated them to the current `Admin` interface while preserving the same behavior.
- The Python verifier tried to read `broker.rack` from confluent-kafka broker metadata and then simulated rack IDs in the report. Updated it to require a real broker-to-rack mapping from deployment inventory or broker configuration because confluent-kafka broker metadata exposes broker ID, host, and port, but not rack.
- The manual reassignment example generated the same replica order for every partition and could silently produce too few replicas in edge cases. Updated it to rotate rack and broker selection by partition and throw an error if the requested replication factor cannot be satisfied with unique brokers.
- The Strimzi example used an older API version and omitted the `rack.type` field required by current Strimzi rack configuration examples. Updated the resource to `kafka.strimzi.io/v1` and added `type: topology-label`.
- The consumer rack awareness section implied `client.rack` alone enables nearest-replica fetching. Added the broker-side `replica.selector.class=org.apache.kafka.common.replica.RackAwareReplicaSelector` requirement and clarified the Python consumer comment.
- The Prometheus alert used non-standard metric names for rack distribution. Replaced it with an alert against a custom gauge emitted by the verification job, avoiding a misleading built-in metric assumption.
- The conclusion and best-practice language around rack failure and rack-aware consumers was softened to avoid overclaiming guarantees.

## Review Notes
Kafka's rack-aware assignment honors the constraint when topics are created, modified, or replicas are reassigned, and spans `min(number of racks, replication factor)` racks where possible. Existing topics may still need reassignment after changing broker rack configuration or after Kubernetes pod rescheduling changes broker rack placement.
