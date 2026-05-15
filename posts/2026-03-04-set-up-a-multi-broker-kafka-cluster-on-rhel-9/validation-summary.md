# Validation Summary: How to Set Up a Multi-Broker Kafka Cluster on RHEL

## Status
not-technically-relevant

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Apache Kafka
- systemd
- firewalld
- SELinux

## Sources Consulted
- Apache Kafka Quickstart: https://kafka.apache.org/quickstart
- Apache Kafka KRaft documentation: https://kafka.apache.org/documentation/#kraft
- Apache Kafka broker configuration documentation: https://kafka.apache.org/documentation/#brokerconfigs
- Apache Kafka topic command documentation: https://kafka.apache.org/documentation/#basic_ops_add_topic
- Red Hat Enterprise Linux 9 systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post title and description promise a multi-broker Kafka cluster setup on RHEL 9, but the body contains generic placeholder service instructions such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>`.
- The post omits the core Kafka setup steps needed for a multi-broker cluster, including Java/Kafka installation, broker node configuration, KRaft or ZooKeeper coordination details, unique broker/node IDs, listener and advertised listener configuration, controller quorum configuration for KRaft, log directory setup, and service unit creation.
- The verification commands reference Kafka tools under `/opt/kafka/bin`, but the post never installs Kafka there or creates/configures a Kafka service, so the commands would not work from the preceding instructions.
- The post's generic firewall section does not specify Kafka broker or controller ports and therefore does not validate the cluster networking required by Kafka.
- These issues cannot be fixed by small technical corrections while preserving the current structure; making the post accurate would require replacing the placeholder content with a complete Kafka cluster guide.

## Review Notes
This post should be removed or rewritten as a real RHEL 9 Kafka multi-broker cluster tutorial. A future rewrite should target a specific Kafka mode, preferably KRaft for current Kafka versions, and include versioned installation, per-node broker configuration, systemd units, firewall ports, and multi-node verification.
