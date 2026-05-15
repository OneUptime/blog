# Validation Summary: How to Install and Configure Apache Kafka on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Apache Kafka
- KRaft mode
- Java/OpenJDK
- systemd
- firewalld

## Sources Consulted
- Apache Kafka 4.2.0 release announcement: https://kafka.apache.org/blog/2026/02/17/apache-kafka-4.2.0-release-announcement/
- Apache Kafka downloads page: https://kafka.apache.org/community/downloads/
- Apache Kafka 4.2 quickstart: https://kafka.apache.org/42/getting-started/quickstart/
- Apache Kafka 4.2 broker configuration reference: https://kafka.apache.org/42/configuration/broker-configs/
- Apache Kafka 4.2 Java version guidance: https://kafka.apache.org/42/operations/java-version/
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post used Apache Kafka 3.7.0 from `downloads.apache.org`, but 3.7.0 is now listed under archived releases while 4.2.0 is a supported release. Updated the download URL, extracted directory name, and examples to use Apache Kafka 4.2.0.
- The post used `/opt/kafka/config/kraft/server.properties`, but the Apache Kafka 4.2 quickstart uses `config/server.properties` for the downloaded distribution. Updated the storage format command and systemd unit to use `/opt/kafka/config/server.properties`.
- The post formatted KRaft storage before applying the custom `log.dirs` setting. Moved the log directory creation and configuration instructions before `kafka-storage.sh format`, because KRaft storage must be formatted using the final storage configuration.
- The post described `node.id` as "Broker ID". Updated that label to "Node ID" to match KRaft terminology.
- The Kafka 4.2 quickstart formats standalone storage with `kafka-storage.sh format --standalone`. Added `--standalone` to the format command.

## Review Notes
The tutorial remains a single-node development-style setup. For production use, it should add security, multi-node controller/broker planning, replication, and service hardening.
