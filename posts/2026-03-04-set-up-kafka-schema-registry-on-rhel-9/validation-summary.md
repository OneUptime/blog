# Validation Summary: How to Set Up Kafka Schema Registry on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Apache Kafka
- Confluent Schema Registry
- systemd
- firewalld
- SELinux

## Sources Consulted
- Confluent Documentation: Schema Registry concepts and supported schema formats, https://docs.confluent.io/platform/current/schema-registry/fundamentals/index.html
- Confluent Documentation: Install Confluent Platform using Systemd on RHEL, CentOS, and Fedora-based Linux, https://docs.confluent.io/platform/current/installation/installing_cp/rhel-centos.html
- Confluent Documentation: Schema Registry configuration options, https://docs.confluent.io/platform/current/schema-registry/installation/config.html
- Confluent Documentation: Use Confluent Platform systemd Service Unit Files, https://docs.confluent.io/platform/current/installation/installing_cp/scripted-install.html
- Apache Kafka Documentation: Quickstart and Kafka topic command examples, https://kafka.apache.org/quickstart
- Red Hat Documentation: Configuring firewalls and packet filters in RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The post is placeholder content rather than a usable Schema Registry setup guide. It references generic paths and units such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>` instead of the actual Schema Registry configuration file, service name, package, and default API port.
- The guide omits the actual Schema Registry installation steps for RHEL-based systems. Confluent's RPM/systemd documentation describes package repository setup, package installation, and the `confluent-schema-registry` systemd unit, none of which are present in the post.
- The configuration instructions are technically incorrect for Schema Registry. Official Confluent documentation uses `/etc/schema-registry/schema-registry.properties` for RPM/systemd installs and key settings such as `listeners` and `kafkastore.bootstrap.servers`, not `/etc/<service>/config.conf`.
- The verification section checks Kafka broker and topic operations with Kafka CLI tools, but does not verify that Schema Registry is installed, running, listening on its REST API, or connected to Kafka.
- Because the post is generic placeholder content with no concrete, correct Schema Registry setup path, it should be removed or replaced rather than lightly edited.

## Review Notes
The introductory description of Schema Registry broadly matches Confluent documentation: Schema Registry provides a REST interface for Avro, JSON Schema, and Protobuf schemas and supports compatibility checks. However, the implementation content does not support the title or description.
