# Validation Summary: How to Fix 'Leader Not Available' Errors in Kafka

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka brokers, topics, partitions, replication, ISR, and controller behavior
- Apache Kafka CLI tools
- ZooKeeper and KRaft metadata management
- Java Kafka producer and consumer configuration
- kafka-python producer, consumer, and admin clients
- Prometheus/JMX-style Kafka monitoring

## Sources Consulted
- Apache Kafka basic operations: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka KRaft operations and metadata tools: https://kafka.apache.org/41/operations/kraft/
- Apache Kafka producer configuration reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka consumer configuration reference: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka monitoring reference: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka error Javadocs for leader availability: https://kafka.apache.org/41/javadoc/org/apache/kafka/common/errors/package-summary.html
- Confluent Kafka broker configuration reference: https://docs.confluent.io/platform/current/installation/configuration/broker-configs.html
- kafka-python KafkaAdminClient documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaAdminClient.html
- Confluent Kafka CLI tools reference: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html

## Issues Found
- Corrected the description of replicas from "other brokers" to "other assigned replicas" because not every broker necessarily hosts a replica for every partition.
- Qualified leader election as normally selecting from the ISR, because unclean leader election can allow an out-of-sync replica to become leader as a last resort.
- Replaced the non-existent `kafka-metadata.sh --command controller` examples with `kafka-metadata-quorum.sh describe --status` for KRaft clusters and kept ZooKeeper controller lookup for ZooKeeper-based clusters.
- Updated the leader election sequence diagram to refer generically to the metadata store instead of showing ZooKeeper/KRaft as if both used the same ZooKeeper-style interactions.
- Added `kafka-topics.sh --describe --unavailable-partitions` as the direct CLI check for partitions with no leader.
- Changed the broker health command text so it no longer claims that `kafka-broker-api-versions.sh` directly lists broker IDs.
- Replaced brittle fixed-column `awk` parsing of `kafka-topics.sh --describe` with label-based parsing.
- Added KRaft-specific metadata quorum and metadata shell commands to the ZooKeeper/KRaft state check.
- Clarified that the leader election JSON file specifies partitions for leader election, not partition reassignment.
- Added the immediate `kafka-leader-election.sh --election-type unclean` step after dynamically enabling unclean leader election, matching KRaft behavior documented for this setting.
- Fixed the kafka-python health-check example to use dict access for `describe_cluster()` and `describe_topics()` responses instead of Java-style object attributes.

## Review Notes
The Java producer and consumer settings use valid Kafka client configuration keys. The Prometheus metric names are plausible for common JMX exporter mappings, but exact Prometheus names can vary by exporter configuration, so production alert rules should be checked against the deployed metrics endpoint.
