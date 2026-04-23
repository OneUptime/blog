# Validation Summary: How to Configure Message Queue Persistence in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ quorum queues
- Pika (Python RabbitMQ client)
- Strimzi
- Apache Kafka
- NATS JetStream
- Longhorn
- kubectl

## Sources Consulted
- RabbitMQ Cluster Operator docs: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ persistence configuration: https://www.rabbitmq.com/docs/persistence-conf
- RabbitMQ quorum queues: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ virtual hosts and default queue type: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ management CLI / `rabbitmqadmin`: https://www.rabbitmq.com/docs/management-cli
- Pika BlockingConnection and channel docs: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html
- Strimzi deploy/manage docs: https://strimzi.io/docs/operators/latest/full/deploying
- Strimzi example manifests: https://github.com/strimzi/strimzi-kafka-operator/tree/main/examples/kafka
- Apache Kafka broker config reference: https://kafka.apache.org/documentation/#brokerconfigs
- Apache Kafka topic config reference: https://kafka.apache.org/documentation/#topicconfigs
- NATS JetStream concepts: https://docs.nats.io/nats-concepts/jetstream
- NATS streams docs: https://docs.nats.io/nats-concepts/jetstream/streams
- NATS Helm chart values: https://github.com/nats-io/k8s/blob/main/helm/charts/nats/values.yaml
- Longhorn recurring jobs docs: https://longhorn.io/docs/latest/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn RecurringJob API source: https://github.com/longhorn/longhorn-manager/blob/master/k8s/pkg/apis/longhorn/v1beta2/recurringjob.go

## Issues Found
- RabbitMQ used `queue.default_queue_type`, which is not the current node-wide setting name. It was changed to `default_queue_type`, and unsupported or misleading persistence keys were removed in favor of the documented quorum WAL setting.
- The RabbitMQ Python example used hardcoded credentials that were not created anywhere in the post. It was changed to read credentials from environment variables so the example can be wired to the operator-managed secret.
- The RabbitMQ publish comment implied `delivery_mode=Persistent` is what makes quorum queue messages survive restarts. The comment was corrected so it no longer overstates that behavior.
- The Kafka manifest used the older `kafka.strimzi.io/v1beta2` API and an incomplete `Kafka` custom resource shape. It was replaced with current `kafka.strimzi.io/v1` `KafkaNodePool` and `Kafka` resources based on current Strimzi examples.
- The Kafka section omitted replication settings that materially affect durability. Broker defaults for replication and ISR were added to match a 3-node persistent cluster.
- The Kafka compaction comments were inaccurate. `min.compaction.lag.ms` does not keep compacted records for 24 hours, `delete.retention.ms` governs tombstone retention, and `min.cleanable.dirty.ratio` is about dirty log ratio rather than segment fullness.
- The NATS Helm values used `memStore`, but the current chart uses `memoryStore`. Because memory store is not a cache layer for file-backed streams, that block was removed and the chart values were updated to a 3-node clustered JetStream configuration that matches the later `--replicas 3` example.
- The NATS CLI example used `nats stream create`, while current official docs consistently use `nats stream add`. The example was updated accordingly.
- The NATS shell example placed comments after line-continuation backslashes, which would break the command in a real shell. The command was rewritten so it is syntactically valid.
- The Longhorn section used PVC annotations, but recurring job assignment is done with labels. The example was updated to use `kubectl label`, and the required `recurring-job.longhorn.io/source=enabled` label was added so PVC labels propagate to the Longhorn volume.
- The RabbitMQ disaster-recovery script referenced the wrong pod name for Cluster Operator-managed pods, claimed to publish 1000 messages while only publishing one, and used a restart wait pattern that could race. The script was corrected to use the operator’s pod naming, declare a quorum queue first, publish 1000 persistent messages, retrieve operator-managed credentials from the default-user secret, and wait for the recreated pod explicitly.

## Review Notes
- RabbitMQ quorum queues are always durable and persist messages to disk regardless of AMQP delivery mode, though `delivery_mode=2` still matters for some cases such as dead-lettered messages routed to durable target queues.
- Kafka durability is not just a storage question; replication factor and `min.insync.replicas` materially affect write safety and should stay aligned with producer `acks=all` in production.
- The post is still framed as “Rancher”, but the mechanics shown are Kubernetes/operator-level configurations that also apply outside Rancher.
