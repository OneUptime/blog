# Validation Summary: How to Plan Kafka Disaster Recovery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- Kafka MirrorMaker 2
- Kafka AdminClient for Java
- confluent-kafka Python client
- Kafka command-line tools
- Kubernetes kubectl
- Prometheus alert rules

## Sources Consulted
- Apache Kafka MirrorMaker 2 configuration documentation: https://kafka.apache.org/40/configuration/mirrormaker-configs/
- Apache Kafka operations guide for consumer group commands: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Confluent Kafka consumer group operations documentation: https://docs.confluent.io/kafka/operations-tools/manage-consumer-groups.html
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Red Hat Streams for Apache Kafka MirrorMaker 2 documentation for offset synchronization behavior: https://docs.redhat.com/en/documentation/red_hat_streams_for_apache_kafka/2.7/html/using_streams_for_apache_kafka_on_rhel_in_kraft_mode/assembly-mirrormaker-str

## Issues Found
- The Java example used `Node` without importing `org.apache.kafka.common.Node`, so the snippet would not compile. Added the missing import.
- The Java example used `var`, which requires Java 10+. Replaced it with an explicit `Map.Entry<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo>` type so the snippet works in Java 8+ environments commonly used with Kafka clients.
- The failover instructions implied consumer offsets are always synced by MirrorMaker 2. Clarified that MM2 writes translated offsets only when offset syncing is enabled and the consumer group is inactive on the target cluster.
- The failover instructions only told clients to change `bootstrap.servers`. Clarified that, with MirrorMaker 2's default replication policy, consumers must use remote topic names such as `primary.<topic>` unless `IdentityReplicationPolicy` is configured.
- The DR test labeled a write to the DR cluster as a "read-only test". Changed this to "non-production test" because the code produces a message.
- The Prometheus alert used a non-standard-looking `kafka_mirrormaker_replication_lag_seconds` metric name. Replaced it with a site-defined `kafka_dr_replication_lag_seconds` recording metric name to avoid implying an official Kafka-exported metric.

## Review Notes
MirrorMaker 2 configuration properties in the post match current Apache Kafka documentation, including `topics.exclude`, `replication.factor`, `emit.checkpoints.enabled`, `sync.group.offsets.enabled`, and heartbeat settings. The example still remains illustrative: real DR automation should explicitly verify translated offsets, topic naming policy, ACLs, schemas, client DNS behavior, and failback procedures in the target environment.
