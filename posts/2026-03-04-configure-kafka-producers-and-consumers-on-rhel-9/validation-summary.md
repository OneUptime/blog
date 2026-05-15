# Validation Summary: How to Configure Kafka Producers and Consumers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Apache Kafka
- Kafka producer and consumer CLI tools
- firewalld
- SELinux

## Sources Consulted
- Apache Kafka Quickstart: https://kafka.apache.org/quickstart/
- Red Hat Streams for Apache Kafka on RHEL documentation: https://docs.redhat.com/en/documentation/red_hat_streams_for_apache_kafka/3.0/html-single/using_streams_for_apache_kafka_on_rhel/using_streams_for_apache_kafka_on_rhel
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 system service documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index
- Local `systemctl --help` output for systemd command syntax.

## Issues Found
- The original post used placeholder service paths such as `/etc/<service>/config.conf` and `<service-name>`, which would not configure Kafka producers or consumers. Updated the section to use Kafka producer and consumer properties files under `/opt/kafka/config/`.
- The original service restart and systemctl commands referenced an unspecified service. Updated the startup example to use Kafka's `kafka-server-start.sh` script for an `/opt/kafka` installation.
- The firewall command used a placeholder port. Updated it to open Kafka's default broker port, `9092/tcp`.
- The verification section checked broker and topic commands but did not validate producer or consumer behavior. Added official Kafka console producer and consumer commands using `--producer.config`, `--consumer.config`, `--bootstrap-server`, `--topic`, and `--from-beginning`.
- The troubleshooting section referenced placeholder systemd logs and package names. Updated it to point to Kafka logs under `/opt/kafka/logs/server.log` and to verify the Kafka and Java installation assumptions.
- The prerequisites did not state that Kafka must already be installed. Added the required `/opt/kafka` installation and `kafka` user assumption used by the commands.

## Review Notes
The post now describes a basic local Kafka client and broker workflow for RHEL-style hosts. It still assumes Kafka has already been installed and does not cover creating the `kafka` user, configuring a production systemd unit, TLS/SASL security, or multi-broker listener configuration.
