# Validation Summary: How to Expand a Kafka Cluster

## Status
validated

## Post Type
Technical guide / operations tutorial

## Technologies Covered
- Apache Kafka
- Kafka KRaft mode
- ZooKeeper-based Kafka clusters
- Kafka command-line tools
- Kafka Java AdminClient
- Confluent Kafka Python client
- Cruise Control

## Sources Consulted
- Apache Kafka Basic Kafka Operations, partition reassignment and throttling: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka KRaft operations documentation: https://kafka.apache.org/39/operations/kraft/
- Apache Kafka KIP-833, KRaft production readiness and ZooKeeper removal plan: https://cwiki.apache.org/confluence/display/KAFKA/KIP-833%3A%2BMark%2BKRaft%2Bas%2BProduction%2BReady
- Apache Kafka 4.0.0 release announcement: https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/
- Apache Kafka Java Admin API Javadocs: https://kafka.apache.org/36/javadoc/org/apache/kafka/clients/admin/Admin.html
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Cruise Control REST API documentation: https://github.com/linkedin/cruise-control/wiki/rest-apis
- Cruise Control running without ZooKeeper documentation: https://github.com/linkedin/cruise-control/wiki/Run-without-ZooKeeper

## Issues Found
- The prerequisites incorrectly described Kafka 2.4+ as recommended for KRaft. Updated this to Kafka 3.3+ for production KRaft, Kafka 4.0+ for KRaft-only clusters, and ZooKeeper-based clusters on Kafka 3.x and earlier.
- The broker configuration mixed ZooKeeper and KRaft guidance without the required KRaft broker settings. Clarified that `broker.id` and `zookeeper.connect` apply to ZooKeeper mode, and added KRaft-specific `node.id`, `process.roles`, `controller.quorum.voters`, and `controller.listener.names` examples.
- The startup steps omitted the required KRaft storage formatting step before first startup. Added a `kafka-storage.sh format` example for new KRaft brokers using the existing cluster ID.
- The cluster membership verification used `kafka-metadata.sh`, which is not the standard Kafka metadata shell command. Replaced the example with `kafka-broker-api-versions.sh`, which is a valid way to list brokers visible through the Admin API.
- The Java example imported `TopicPartitionReplica` even though it was unused. Removed the unused import.
- The Python section claimed to use both `kafka-python` and `confluent-kafka`, but the code only used `confluent-kafka`. Updated the description and removed unused imports.
- The Cruise Control configuration showed `zookeeper.connect` without a KRaft caveat. Added a comment that it applies only to ZooKeeper-based clusters and should be removed for KRaft clusters.
- The throttling best-practice text implied manual broker throttle configuration as the primary method. Clarified that `--throttle` on `kafka-reassign-partitions.sh` is the safest primary option, while `kafka-configs.sh` can inspect or adjust broker-level throttle values.

## Review Notes
The Java AdminClient reassignment example uses current APIs, but it starts reassignments rather than waiting for data movement to finish. The CLI `--verify` workflow remains the clearer operational verification path for production runbooks.
