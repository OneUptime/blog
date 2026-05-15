# Validation Summary: How to Set Up Kafka with ZooKeeper on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Apache Kafka 3.x
- Apache ZooKeeper
- systemd
- firewalld
- SELinux troubleshooting

## Sources Consulted
- Apache Kafka 3.9 Quick Start: https://kafka.apache.org/39/getting-started/quickstart/
- Apache Kafka 4.0 Upgrade Notes: https://kafka.apache.org/40/getting-started/upgrade/
- Red Hat Streams for Apache Kafka 2.9, Using Streams for Apache Kafka on RHEL with ZooKeeper: https://docs.redhat.com/en/documentation/red_hat_streams_for_apache_kafka/2.9/html/using_streams_for_apache_kafka_on_rhel_with_zookeeper/
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- systemd systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The post said KRaft mode was replacing ZooKeeper but did not specify that Apache Kafka 4.0 and later removed ZooKeeper mode. Updated the wording and prerequisites to make the tutorial explicitly target Apache Kafka 3.x.
- The prerequisites did not mention Java or an existing Kafka installation under `/opt/kafka`, even though every command depends on those files. Added that prerequisite.
- The configuration commands used shell redirection to write under `/opt/kafka`, which fails for sudo users who are not already root. Replaced those writes with `sudo tee`.
- The tutorial started Kafka and ZooKeeper with daemon scripts, then used placeholder systemd commands for an undefined service. Replaced the placeholders with concrete `zookeeper.service` and `kafka.service` unit files and matching `systemctl` commands.
- The firewall section used a placeholder port. Replaced it with Kafka's broker port, `9092/tcp`.
- The troubleshooting section used placeholder service and package names. Replaced them with concrete Kafka/ZooKeeper journal lookup and Java package checks.

## Review Notes
This remains a single-node development-style setup. For production, the post should eventually cover a dedicated service user, ownership of Kafka data directories, listener configuration for remote clients, TLS/SASL, multi-node ZooKeeper/Kafka configuration, and migration planning from ZooKeeper mode to KRaft.
