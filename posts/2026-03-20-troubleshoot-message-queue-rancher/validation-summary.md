# Validation Summary: How to Troubleshoot Message Queue Issues in Rancher - Message Queue

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Rancher / Kubernetes (kubectl)
- RabbitMQ (rabbitmqctl)
- Apache Kafka (kafka-topics.sh, kafka-consumer-groups.sh, kafka-metadata-quorum.sh)
- Persistent Volume Claims (PVCs), StorageClasses
- NetworkPolicy, Kubernetes Services
- busybox / netcat (nc) for connectivity testing

## Sources Consulted
- RabbitMQ rabbitmqctl man page: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- Apache Kafka MetadataQuorumCommand source: https://github.com/apache/kafka/blob/trunk/tools/src/main/java/org/apache/kafka/tools/MetadataQuorumCommand.java
- Apache Kafka KRaft metadata tool docs: https://kafka.apache.org/documentation/#kraft_metadata_tool
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- RabbitMQ default ports (AMQP 5672): https://www.rabbitmq.com/docs/networking#ports

## Issues Found

1. **`rabbitmqctl reset` missing prerequisite** — The original post ran `rabbitmqctl reset` as a single step. The RabbitMQ docs require the application to be stopped first (`stop_app`), and typically restarted (`start_app`) afterward. Updated the command sequence to include `stop_app` before and `start_app` after `reset`, so the command as written will actually succeed.

2. **`kafka-metadata-quorum.sh --describe` syntax** — The original post used `--describe` as a flag. In the Apache Kafka CLI, `describe` is a positional subcommand that also requires `--status` or `--replication`. Changed to `describe --status`, which matches the tool's actual argument parser.

## Review Notes
- All kubectl commands (get/describe/logs/exec/run) use correct flags and namespace syntax.
- `kafka-topics.sh --describe --under-replicated-partitions` is correct (flag-based here, unlike `kafka-metadata-quorum.sh`).
- RabbitMQ AMQP port 5672 in the netcat test is correct.
- `kubectl run --rm -it --image=busybox --restart=Never` is the supported pattern for ephemeral debug pods in modern kubectl versions.
- Post title contains "- Message Queue" as a trailing fragment, which reads awkwardly but is a stylistic/editorial matter, not a technical error, so it was left unchanged per review scope.
- The post is framed around Rancher but the commands are generic Kubernetes; this is appropriate since Rancher manages standard Kubernetes clusters.
