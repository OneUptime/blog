# Validation Summary: How to Deploy Kafka with KRaft Mode (Without ZooKeeper) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache Kafka
- Kafka KRaft mode
- systemd
- firewalld
- Bash

## Sources Consulted
- Apache Kafka KRaft documentation: https://kafka.apache.org/42/operations/kraft/
- Apache Kafka ZooKeeper to KRaft differences documentation: https://kafka.apache.org/40/documentation/zk2kraft.html
- Red Hat Streams for Apache Kafka 2.9, Using Streams for Apache Kafka on RHEL in KRaft mode: https://docs.redhat.com/en/documentation/red_hat_streams_for_apache_kafka/2.9/pdf/using_streams_for_apache_kafka_on_rhel_in_kraft_mode/Red_Hat_Streams_for_Apache_Kafka-2.9-Using_Streams_for_Apache_Kafka_on_RHEL_in_KRaft_mode-en-US.pdf
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings

## Issues Found
- The post title and description promised KRaft mode without ZooKeeper, but the configuration started ZooKeeper and used `zookeeper.connect`. Replaced the ZooKeeper-based example with a single-node KRaft configuration using `process.roles`, `node.id`, controller listener settings, and `controller.quorum.voters`.
- The original commands started Kafka without formatting KRaft metadata storage. Added `kafka-storage.sh random-uuid` and `kafka-storage.sh format` before first startup, which is required for KRaft storage initialization.
- The service management commands used `<service-name>` placeholders without creating a service. Added a concrete `kafka.service` systemd unit, `systemctl daemon-reload`, and concrete enable/start/status commands.
- The firewall example used a `<PORT>` placeholder. Replaced it with Kafka's client listener port, `9092/tcp`.
- The troubleshooting section used placeholder service and package names. Updated it to reference `kafka.service` and Java availability.
- The prerequisites did not state that Kafka binaries and Java must already be installed even though the commands require `/opt/kafka/bin/*`. Added that prerequisite.

## Review Notes
The corrected example is appropriate for a single-node development or test deployment. Production KRaft deployments should use multiple brokers and controllers, non-local advertised listener addresses, durable storage planning, authentication, authorization, TLS, and appropriately replicated internal topics.
