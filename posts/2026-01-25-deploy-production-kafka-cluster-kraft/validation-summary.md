# Validation Summary: How to Deploy a Production Kafka Cluster with KRaft

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- KRaft mode
- Kafka controller quorums
- Kafka storage formatting tools
- Kafka command-line administration tools
- Kafka broker and controller configuration
- systemd service management

## Sources Consulted
- Apache Kafka 4.3 KRaft operations documentation: https://kafka.apache.org/43/operations/kraft/
- Apache Kafka 4.3 Hardware and OS documentation, KRaft controller disk replacement: https://kafka.apache.org/43/operations/hardware-and-os/
- Apache Kafka 4.3 generated broker configuration reference: https://kafka.apache.org/43/generated/kafka_config.html
- Apache Kafka KIP-833, Mark KRaft as Production Ready: https://cwiki.apache.org/confluence/display/KAFKA/KIP-833%3A%2BMark%2BKRaft%2Bas%2BProduction%2BReady
- Apache Kafka 4.0.0 release announcement: https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/

## Issues Found
- The introduction said Kafka 3.3+ introduced KRaft as production-ready. Corrected this to state that Kafka 3.3 marked KRaft production-ready for new clusters and Kafka 4.0 removed ZooKeeper mode.
- The architecture diagram used `broker.id` for KRaft controllers and brokers. Updated it to use `node.id`, which is the required KRaft identifier.
- The configuration examples used `controller.quorum.voters`, the older static quorum configuration. Updated controller and broker examples to use `controller.quorum.bootstrap.servers`, which is the current dynamic quorum configuration.
- The controller configuration used `log.dirs` for the metadata directory. Changed it to `metadata.log.dir` to make the controller metadata location explicit.
- The storage formatting examples omitted dynamic quorum bootstrap flags and recommended `--ignore-formatted` as safe for automation. Added controller directory IDs, `--initial-controllers` for initial controllers, `--no-initial-controllers` for brokers, and clarified that `--ignore-formatted` should not be a default automation flag.
- The verification section used a non-existent `kafka-metadata.sh` command. Replaced it with documented `kafka-metadata-quorum.sh` and `kafka-dump-log.sh` commands.
- The checklist recommended backing up `__cluster_metadata` as a topic. Reworded this as a recovery-strategy item because controller metadata recovery requires care and stale metadata copies can be unsafe.
- The controller replacement commands used non-existent `kafka-metadata.sh` subcommands and omitted the controller directory ID required for removal. Replaced them with `kafka-metadata-quorum.sh describe --status`, `remove-controller`, `describe --replication`, and `add-controller` examples aligned with dynamic quorum documentation.

## Review Notes
- The post now follows Kafka 4.1+ dynamic controller quorum guidance. Older Kafka 3.3-4.0 static quorum deployments used `controller.quorum.voters`; readers running those versions should check the matching version of the Apache Kafka documentation.
- The SSL listener example is structurally valid but not complete for production TLS because real deployments must also configure keystores, truststores, and authentication settings.
