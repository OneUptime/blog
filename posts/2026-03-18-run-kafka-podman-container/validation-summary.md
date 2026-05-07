# Validation Summary: How to Run Kafka in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka 3.7.0
- Kafka KRaft mode
- Kafka command-line tools
- Podman containers
- Container volumes and port publishing

## Sources Consulted
- Apache Kafka 3.7 Docker documentation: https://kafka.apache.org/37/getting-started/docker/
- Apache Kafka 3.7 Quick Start: https://kafka.apache.org/37/getting-started/quickstart/
- Apache Kafka Docker image usage guide: https://github.com/apache/kafka/blob/trunk/docker/examples/README.md
- Apache Kafka 3.7.0 official Docker image command output for `/opt/kafka/bin/kafka-get-offsets.sh --help`
- Apache Kafka 3.7.0 official Docker image runtime verification with the post's KRaft environment variables

## Issues Found
- The offset inspection command used `kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list`, but the `kafka.tools.GetOffsetShell` class is not loadable that way in the official `apache/kafka:3.7.0` image. Replaced it with `/opt/kafka/bin/kafka-get-offsets.sh --bootstrap-server localhost:9092 --topic my-events`, which is the shipped tool and uses the non-deprecated bootstrap option.
- The producer example comment described an interactive producer session, but the command pipes one message with `echo`. Updated the comment to match the command behavior.
- The broker API versions command was labeled as describing broker configuration. Updated the comment to say it shows broker API versions.

## Review Notes
The official Kafka Docker image accepts the `CLUSTER_ID` environment variable used in the post and successfully starts a single-node combined broker/controller in KRaft mode with the provided settings. Kafka 3.7 documentation is version-specific and now marked as older documentation by Apache; future updates could consider a newer Kafka image tag, but the post is accurate for the stated `apache/kafka:3.7.0` image.
