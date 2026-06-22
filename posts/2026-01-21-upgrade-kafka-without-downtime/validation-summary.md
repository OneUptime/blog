# Validation Summary: How to Upgrade Kafka Without Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- Kafka rolling upgrades
- Kafka ZooKeeper mode
- Kafka KRaft mode
- Kafka AdminClient for Java
- confluent-kafka Python AdminClient
- Kafka command-line tools
- Kafka broker configuration

## Sources Consulted
- Apache Kafka 3.7 upgrade guide: https://kafka.apache.org/37/getting-started/upgrade/
- Apache Kafka 3.9 upgrade guide: https://kafka.apache.org/39/getting-started/upgrade/
- Apache Kafka 3.7 KRaft operations and ZooKeeper to KRaft migration guide: https://kafka.apache.org/37/operations/kraft/
- Apache Kafka 3.8 KRaft metadata quorum tool documentation: https://kafka.apache.org/38/operations/kraft/
- Apache Kafka 3.7 broker configuration documentation: https://kafka.apache.org/37/configuration/broker-configs/
- Apache Kafka 3.7 Java AdminClient Javadocs: https://kafka.apache.org/37/javadoc/
- Apache Kafka ACL command documentation: https://kafka.apache.org/37/security/authorization-and-acls/

## Issues Found
- The post described Kafka upgrade compatibility as a simple previous-minor-version rule. I changed this to refer to Kafka's documented upgrade paths and the need to keep the protocol or metadata version pinned during the first rolling restart.
- The post treated `inter.broker.protocol.version` as the central upgrade setting for all clusters. I clarified that this applies to ZooKeeper-based clusters and that KRaft-based clusters use `metadata.version`.
- The post instructed users to set `log.message.format.version=3.5` and later `log.message.format.version=3.7` for a modern 3.x upgrade. I removed those direct settings and clarified that `log.message.format.version` should only be kept or changed if it was explicitly overridden.
- The controller-status command used a non-existent `kafka-metadata.sh --command "controller"` invocation. I replaced it with the documented `kafka-metadata-quorum.sh --bootstrap-server localhost:9092 describe --status` command for KRaft clusters.
- The Kafka download URL used `downloads.apache.org` for Kafka 3.7.0, which is not a stable URL for older releases. I changed it to the Apache archive URL for Kafka 3.7.2.
- The KRaft metadata-version bump used protocol-oriented wording only. I added the documented `bin/kafka-features.sh upgrade --metadata 3.7` command for KRaft-based clusters.
- The Java example had unused imports and an unused field. I removed them so the example is cleaner and compiles without those warnings.
- The Python example imported unused symbols. I removed the unused imports.
- The generated shell script's `check_cluster_health` function used `grep -q "^$"`, which fails when `kafka-topics.sh --under-replicated-partitions` returns no output for a healthy cluster. I changed it to capture the command output and test that it is empty.
- The ZooKeeper-to-KRaft migration section used oversimplified and incorrect commands, including a non-existent `kafka-metadata.sh --command "migrate"` command. I replaced that block with the documented migration flow: upgrade to Kafka 3.7.2, use the existing cluster ID, format KRaft controllers, start the migration-enabled controller quorum, roll brokers into migration mode, reconfigure brokers as KRaft brokers, and finalize by removing migration mode from controllers.
- The troubleshooting command used uppercase `PREFERRED` for `kafka-leader-election.sh --election-type`. I changed it to the documented lowercase `preferred`.

## Review Notes
The article is now technically accurate for the Kafka 3.7 upgrade path it uses as an example. Future updates should revisit Kafka 4.x caveats because Kafka 4.0 removed ZooKeeper mode, so ZooKeeper-based clusters must migrate to KRaft before upgrading to Kafka 4.x or later.
