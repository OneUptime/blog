# Validation Summary: How to Install and Configure Apache Kafka on RHEL 9

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache Kafka 3.7.0
- Kafka KRaft mode
- Java 17 / OpenJDK
- systemd
- firewalld

## Sources Consulted
- Apache Kafka 3.7 Quick Start: https://kafka.apache.org/37/getting-started/quickstart/
- Apache Kafka 3.7 KRaft documentation: https://kafka.apache.org/37/operations/kraft/
- Apache Kafka downloads page: https://kafka.apache.org/downloads.html
- Apache Kafka 3.7.0 archive directory: https://archive.apache.org/dist/kafka/3.7.0/
- Red Hat OpenJDK 17 installation documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/17/html/installing_and_using_red_hat_build_of_openjdk_17_on_rhel/installing-openjdk-on-rhel_openjdk
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The Kafka download command used `https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz`, but Kafka 3.7.0 is an older release and the Apache mirror redirects users to the archive for that object. Updated the URL to `https://archive.apache.org/dist/kafka/3.7.0/kafka_2.13-3.7.0.tgz`.
- The Kafka data directory was created after running `kafka-storage.sh format`, even though `log.dirs` points to `/var/lib/kafka/data`. Moved the `mkdir` and `chown` commands before the storage format step so the `kafka` user can initialize the configured log directory.
- The single-node KRaft example used combined broker/controller mode without stating the scope. Updated the sentence to identify it as a single-node development setup, matching Apache Kafka guidance that combined mode should not be used for critical production deployments.
- The topic creation command omitted an explicit replication factor. Added `--replication-factor 1` to match the single-node broker configuration and avoid ambiguity.
- The console producer command used `--broker-list`. Updated it to the documented `--bootstrap-server` option used by Kafka 3.7 command examples.

## Review Notes
- The post remains a single-node Kafka guide. Production deployments should use separate controllers and brokers, multiple nodes, replication greater than 1, advertised listener configuration appropriate for remote clients, and release-signature or checksum verification for downloaded Apache artifacts.
