# Validation Summary: How to Install and Configure rsyslog with Kafka Output on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 / CentOS Stream 9
- rsyslog
- rsyslog omkafka output module
- Apache Kafka 3.7.0
- systemd
- firewalld
- SELinux troubleshooting

## Sources Consulted
- Apache Kafka 3.7 Quick Start: https://kafka.apache.org/37/getting-started/quickstart/
- Apache Kafka downloads page for Kafka 3.7.0 artifacts: https://kafka.apache.org/downloads.html
- Apache Kafka 3.7.0 archive directory: https://archive.apache.org/dist/kafka/3.7.0/
- rsyslog omkafka module documentation: https://docs.rsyslog.com/doc/configuration/modules/omkafka.html
- Red Hat Enterprise Linux 9 remote logging and rsyslog documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- Red Hat Enterprise Linux 9 package manifest for AppStream package availability: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/package_manifest/repositories

## Issues Found
- The post title and description promised rsyslog Kafka output, but the body only installed Kafka and used placeholder service names. Replaced placeholders with concrete Kafka and rsyslog service commands.
- Kafka 3.7 in KRaft mode requires generating a cluster UUID and formatting storage before starting the broker. Added the `kafka-storage.sh random-uuid` and `kafka-storage.sh format` commands from the Kafka quick start workflow.
- The Kafka download URL pointed at `downloads.apache.org` for an older pinned release that may no longer be available there. Changed it to the Apache archive URL for Kafka 3.7.0.
- The package installation step did not install `rsyslog-kafka`, which provides the Kafka output module. Added `rsyslog`, `rsyslog-kafka`, `wget`, and `firewalld` to the package list.
- The configuration section used invalid placeholder paths such as `/etc/<service>/config.conf`. Replaced it with a concrete `kafka.service` systemd unit and an `/etc/rsyslog.d/10-kafka.conf` configuration using `action(type="omkafka" broker=["localhost:9092"] topic="rsyslog")`.
- The firewall section used a placeholder port. Replaced it with Kafka's default broker port, `9092/tcp`.
- The verification steps only checked Kafka topics and did not verify rsyslog output. Added a `logger` test and a Kafka console consumer command for the `rsyslog` topic.
- Troubleshooting commands used placeholder unit and package names. Replaced them with Kafka and rsyslog-specific commands.

## Review Notes
- Kafka 3.7.0 is a pinned historical release. The post is technically valid for that version, but future updates should consider a supported current Kafka release.
- The systemd unit runs Kafka with the default extracted configuration. Production deployments should use a dedicated service account, externalized log/data directories, authentication, TLS, and a multi-broker Kafka design where required.
