# Validation Summary: How to Build Kafka Controller Quorum

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Kafka
- KRaft controller quorum
- Kafka CLI tools
- Kafka broker and controller configuration
- TLS for Kafka controller listeners
- Kubernetes StatefulSet
- JMX and Prometheus monitoring
- ZooKeeper-to-KRaft migration

## Sources Consulted
- Apache Kafka 3.7 KRaft documentation: https://kafka.apache.org/37/operations/kraft/
- Apache Kafka 3.9 KRaft documentation: https://kafka.apache.org/39/operations/kraft/
- Apache Kafka 4.1 KRaft documentation: https://kafka.apache.org/41/operations/kraft/
- Apache Kafka 3.7 broker configuration reference: https://kafka.apache.org/37/configuration/broker-configs/
- Apache Kafka 3.7 monitoring documentation: https://kafka.apache.org/37/operations/monitoring/
- Confluent Kafka CLI tools reference: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Apache Kafka official Docker image reference: https://hub.docker.com/r/apache/kafka
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The verification commands used a non-existent `kafka-metadata.sh` command and unsupported `--connect` / `--command` options. Replaced them with `kafka-metadata-quorum.sh --bootstrap-controller ... describe --status` and `describe --replication`, matching Apache Kafka's documented metadata quorum tool.
- The broker verification section referenced `kafka-cluster.sh describe`, which is not an Apache Kafka CLI tool. Removed it and kept `kafka-broker-api-versions.sh` as a broker reachability check.
- The guide formatted controller storage but did not format broker storage before startup. Added a `kafka-storage.sh format` command for broker nodes because Kafka KRaft requires every server's storage to be formatted with the cluster ID.
- The storage format output pinned `metadata.version 3.7-IV4`, which is version-specific. Generalized it so the post does not imply that every Kafka version will print the same metadata version.
- The TLS certificate generation script enabled hostname verification but generated certificates without Subject Alternative Names. Added SAN extensions to the key generation, CSR, and signing commands.
- The Kubernetes StatefulSet set `KAFKA_NODE_ID` from `metadata.name`, yielding values like `kafka-controller-0` instead of an integer node ID. Changed it to use the StatefulSet pod index label and added explicit log directory environment variables.
- The controller membership section described static `controller.quorum.voters` edits as a rolling operation. Updated the commands to use Kafka 3.9+ dynamic quorum operations with `kafka-metadata-quorum.sh add-controller` and `remove-controller`.
- The metadata sync troubleshooting command used the same invalid `kafka-metadata.sh` syntax. Replaced it with the documented metadata quorum replication command.
- The ZooKeeper migration section included a fake `kafka-metadata.sh --command migrate` flow. Replaced it with the documented high-level bridge-release flow: retrieve the ZooKeeper cluster ID, format KRaft controllers with it, enable migration mode, roll brokers, finalize, and decommission ZooKeeper after verification.

## Review Notes
- The main configuration examples intentionally remain based on static `controller.quorum.voters`, which is appropriate for Kafka 3.x style static quorums. Kafka 3.9+ and Kafka 4.1 documentation now prefer dynamic quorum configuration with `controller.quorum.bootstrap.servers` for new dynamic quorum setups.
- The Kubernetes YAML is still a compact illustrative example rather than a complete production manifest; a production deployment should include a complete ConfigMap or generated config file, secrets for the cluster ID and TLS material, and stronger health checks.
