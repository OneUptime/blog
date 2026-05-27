# Validation Summary: How to Use Ansible to Install Apache Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Apache Kafka 3.7.0
- Kafka KRaft mode
- Java / OpenJDK 17
- systemd
- Linux sysctl tuning

## Sources Consulted
- Apache Kafka 3.7 KRaft documentation: https://kafka.apache.org/37/operations/kraft/
- Apache Kafka 3.7 Quick Start: https://kafka.apache.org/37/getting-started/quickstart/
- Apache Kafka 3.7 Broker Configs: https://kafka.apache.org/37/configuration/broker-configs/
- Apache Kafka 3.7.0 release announcement: https://kafka.apache.org/blog/2024/02/27/apache-kafka-3.7.0-release-announcement/
- Apache Kafka 3.8 Java Version documentation: https://kafka.apache.org/38/operations/java-version/
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible unarchive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible posix sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Apache Kafka 3.7.0 archive URL check: https://archive.apache.org/dist/kafka/3.7.0/kafka_2.13-3.7.0.tgz

## Issues Found
- The post claimed it covered both ZooKeeper and KRaft modes, but the implementation only covered KRaft. Updated the introduction to accurately describe a KRaft-only guide.
- The Mermaid subgraph label used unquoted spaces and punctuation. Updated it to Mermaid's explicit subgraph ID and quoted label form.
- The prerequisites listed Ansible 2.9+ and RHEL 8+, but the snippets use FQCN module names, the `ansible.posix` collection, Ubuntu `apt`, and an Ubuntu-specific Java path. Updated the prerequisites to Ansible 2.10+ with `ansible.posix` and Ubuntu 20.04+.
- The Java prerequisite said Java 17+, which is broader than the Kafka 3.7 examples validate. Tightened it to Java 17 to match the installed package and systemd `JAVA_HOME`.
- The Kafka binary URL used `downloads.apache.org`, where Kafka 3.7.0 now returns 404. Updated it to the official Apache archive URL for historical releases.
- The KRaft configuration omitted `listener.security.protocol.map` for the custom `CONTROLLER` listener. Added the required listener mapping.
- The KRaft configuration playbook notified a Kafka restart before the systemd service had been created in the tutorial sequence. Removed that premature handler notification and handler from the configuration step.
- The verification playbook used a non-existent/incorrect `kafka-metadata.sh --cluster-id` command. Replaced it with the documented `kafka-metadata-quorum.sh --bootstrap-server ... describe --status` command.
- The topic creation failure condition checked only stdout for an existing topic. Updated it to check stdout and stderr.
- The production note claimed `min.insync.replicas=2` with replication factor 3 ensures no data loss during a broker failure. Reworded it to the accurate condition: acknowledged writes require at least two in-sync replicas when producers use `acks=all`.
- The production note referred to CMS as the default garbage collector, which is inaccurate for the Java 17-based setup. Reworded it to say Kafka's recommended JVM flags use G1GC.
- The architecture text called the combined controller/broker layout a minimal production deployment. Reworded it to "minimal Kafka deployment" because Kafka documentation notes combined KRaft mode is not recommended for critical deployments.

## Review Notes
- The guide remains a basic, unsecured Kafka deployment. Future improvements could add TLS/SASL, checksum verification for the downloaded Kafka archive, a dedicated service-start task, and separate controller nodes for production-grade KRaft deployments.
