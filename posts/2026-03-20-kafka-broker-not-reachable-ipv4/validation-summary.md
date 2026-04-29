# Validation Summary: How to Troubleshoot Kafka Broker Not Reachable on IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- Apache ZooKeeper
- KRaft
- Linux networking and firewall tooling (`ss`, `nc`, `iptables`, `ufw`)
- Log4j / Log4j 2

## Sources Consulted
- Apache Kafka broker configuration docs: https://kafka.apache.org/40/configuration/broker-configs/
- Apache Kafka KRaft operations docs: https://kafka.apache.org/42/operations/kraft/
- Apache Kafka upgrade notes for 4.0: https://kafka.apache.org/40/getting-started/upgrade/
- Apache Kafka basic operations docs: https://kafka.apache.org/42/operations/basic-kafka-operations/
- Apache Kafka quickstart docs: https://kafka.apache.org/38/getting-started/quickstart/
- Apache Kafka ZooKeeper docs for legacy clusters: https://kafka.apache.org/38/operations/zookeeper/
- Apache Kafka `BrokerApiVersionsCommand` source: https://raw.githubusercontent.com/apache/kafka/trunk/tools/src/main/java/org/apache/kafka/tools/BrokerApiVersionsCommand.java
- Apache Kafka runtime launcher source: https://raw.githubusercontent.com/apache/kafka/trunk/bin/kafka-run-class.sh
- Apache Kafka 4.x Log4j2 config: https://raw.githubusercontent.com/apache/kafka/trunk/config/log4j2.yaml
- Apache Kafka 3.9 `zookeeper-shell.sh` source: https://raw.githubusercontent.com/apache/kafka/3.9/bin/zookeeper-shell.sh
- Apache Kafka 3.9 runtime launcher source: https://raw.githubusercontent.com/apache/kafka/3.9/bin/kafka-run-class.sh

## Issues Found
- The ZooKeeper section was presented as generally current Kafka guidance. I updated it to explicitly mark it as legacy Kafka 3.x / classic mode guidance because Kafka 4.0 and later are KRaft-only.
- The KRaft section only checked `controller.quorum.voters`. I updated it to also check `process.roles`, `controller.listener.names`, and `controller.quorum.bootstrap.servers` because current Kafka documentation uses `controller.quorum.bootstrap.servers`, while `controller.quorum.voters` is associated with static quorums and is deprecated in newer KRaft configurations.
- The firewall section implied Kafka requires fixed ports. I corrected that to say Kafka uses the listener ports you configure, and expanded the example `iptables` check to include the controller/alternate listener example port.
- The debug logging section used Log4j 1 style guidance as if it were current. I updated it to show a Kafka 4.x Log4j2 example and kept a note that Kafka 3.x packages may still use `log4j.properties`.
- The conclusion described `kafka-broker-api-versions.sh` as the best verification tool. I softened that to "a useful way" to avoid overstating what the tool proves while keeping the troubleshooting advice accurate.

## Review Notes
- The Kafka CLI examples in the post are valid, but some OS-level examples such as `systemctl`, `/var/log/kafka/server.log`, and `ufw` remain distro/package-specific operational examples rather than universal Kafka defaults.
- The `kafka-broker-api-versions.sh` guidance is reasonable for checking Kafka protocol reachability. Its current implementation first discovers brokers from cluster metadata and then queries each discovered broker for API versions.
