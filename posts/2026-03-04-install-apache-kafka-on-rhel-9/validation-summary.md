# Validation Summary: How to Install Apache Kafka on RHEL

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Apache Kafka 3.7.0
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- OpenJDK 17
- systemd
- firewalld
- SELinux troubleshooting

## Sources Consulted
- Apache Kafka 3.7 Quick Start: https://kafka.apache.org/37/getting-started/quickstart/
- Apache Kafka downloads page: https://kafka.apache.org/downloads.html
- Apache Kafka 3.7.0 archive: https://archive.apache.org/dist/kafka/3.7.0/
- Red Hat Enterprise Linux 9 OpenJDK guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_compilers-and-development-tools_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/
- systemd service documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd execution environment documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html

## Issues Found
- The original download URL used `downloads.apache.org` for Kafka 3.7.0. That release is no longer on the current Apache download mirror, so the URL was changed to the official Apache archive URL for Kafka 3.7.0.
- The package installation step used `wget` without installing it. Added `wget` to the `dnf install` command.
- The service configuration step used placeholders such as `/etc/<service>/config.conf` and `<service-name>`, which would not create or manage Kafka. Replaced them with Kafka's KRaft configuration path, a storage formatting command, and a concrete `kafka.service` systemd unit.
- The guide did not format Kafka's KRaft storage directory before starting the broker. Added `kafka-storage.sh random-uuid` and `kafka-storage.sh format`, matching the Kafka quick start flow.
- The firewall command used a placeholder port. Replaced it with Kafka's default broker port, `9092/tcp`.
- Troubleshooting commands used placeholders for the systemd unit and package name. Replaced them with the concrete `kafka` service and relevant package names.

## Review Notes
Kafka 3.7.0 is available from the Apache archive but is not the latest Kafka release. A future update could move the article to a current Kafka version and include production hardening details such as TLS, SASL, SELinux policy tuning, and a multi-node configuration.
