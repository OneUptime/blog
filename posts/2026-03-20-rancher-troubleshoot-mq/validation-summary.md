# Validation Summary: How to Troubleshoot Message Queue Issues in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RabbitMQ
- Apache Kafka
- Strimzi
- NATS
- JetStream
- Bash

## Sources Consulted
- RabbitMQ `rabbitmqctl` command reference: https://www.rabbitmq.com/docs/3.13/man/rabbitmqctl.8
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/4.1/http-api-reference
- RabbitMQ clustering and network partitions: https://www.rabbitmq.com/docs/3.13/partitions
- RabbitMQ clustering guide: https://www.rabbitmq.com/docs/clustering
- Strimzi operator docs (`jvmOptions`): https://strimzi.io/docs/operators/latest/configuring
- Apache Kafka basic operations: https://kafka.apache.org/42/operations/basic-kafka-operations/
- Apache Kafka official source for topic and log-dirs CLI options: https://raw.githubusercontent.com/apache/kafka/trunk/tools/src/main/java/org/apache/kafka/tools/TopicCommand.java
- Apache Kafka official source for log-dirs CLI options: https://raw.githubusercontent.com/apache/kafka/trunk/tools/src/main/java/org/apache/kafka/tools/LogDirsCommand.java
- NATS JetStream clustering troubleshooting: https://docs.nats.io/running-a-nats-service/configuration/clustering/jetstream_clustering/troubleshooting
- NATS monitoring endpoints: https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- Kubernetes `kubectl` command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The RabbitMQ `list_consumers` example passed unsupported column arguments. I changed it to `rabbitmqctl list_consumers -p /`, which matches the documented command syntax.
- The RabbitMQ stuck-consumer workflow used `list_connections -p /`, which is not a valid `list_connections` flag combination, and then tried to close a connection using an AMQP URI. I replaced this with a `list_channels` check for unacknowledged messages, a valid `list_connections` call that includes `pid`, and a `close_connection` example that uses the Erlang connection PID required by RabbitMQ.
- The RabbitMQ split-brain section used an internal `rabbit_mnesia:status()` evaluation and a reset/join flow that was more destructive than the documented recovery path. I changed it to use `cluster_status` and the official stop/start recovery approach for nodes in the non-trusted partition.
- The RabbitMQ HTTP API example claimed DELETE `/api/queues/.../contents` was more selective than purging. That is incorrect; the endpoint is a purge operation. I corrected the comment accordingly.
- The RabbitMQ disk-pressure example ranked queues by message count even though the section was about space usage. I changed it to use `message_bytes`, which is the documented queue size metric.
- The Kafka consumer-lag example piped `--describe --all-groups` output through `awk` in a way that would only preserve the header because lag rows do not contain the literal string `LAG`. I removed the broken filter.
- The Kafka `kafka-log-dirs.sh` example was missing `--describe`, which is required for the command’s describe mode. I added it.
- The Kafka OOM section tried to `kubectl exec` into a pod that may not be running. I changed the heap-settings check to read the Strimzi `Kafka` custom resource instead.
- The Kafka broker example was labeled as checking metrics, but `kafka-broker-api-versions.sh` checks broker/API connectivity and supported versions. I corrected the comment.
- The diagnostic script used `kubectl events --for=pod --sort-by=...`, which is not a valid combination for this use case. I replaced it with `kubectl get events --sort-by='.lastTimestamp'`.

## Review Notes
- RabbitMQ documents recommend absolute memory thresholds for containerized environments as the long-term configuration. The post’s `set_vm_memory_high_watermark 0.7` example is valid as a temporary troubleshooting action, but it should not be treated as the preferred permanent Kubernetes setting.
- RabbitMQ split-brain recovery depends on the partition handling strategy in use. The corrected example reflects manual recovery after choosing a trusted partition; environments using `pause_minority`, `pause_if_all_down`, or `autoheal` can behave differently.
- Kafka offset resets should normally be previewed with `--dry-run` before `--execute`, and they only succeed when the consumer group is inactive.
