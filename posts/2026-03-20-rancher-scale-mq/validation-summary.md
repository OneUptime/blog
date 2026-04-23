# Validation Summary: How to Scale Message Queue Clusters in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RabbitMQ Cluster Kubernetes Operator
- Apache Kafka
- Strimzi
- Cruise Control
- NATS
- HorizontalPodAutoscaler (HPA)
- KEDA

## Sources Consulted
- RabbitMQ Cluster Kubernetes Operator docs: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ quorum queues guide: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ `rabbitmq-queues` manual page: https://www.rabbitmq.com/docs/4.0/man/rabbitmq-queues.8
- Strimzi Deploying and Managing docs: https://strimzi.io/docs/operators/latest/full/deploying
- Strimzi API reference: https://strimzi.io/docs/operators/in-development/full/configuring
- Kubernetes Horizontal Pod Autoscaler docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- KEDA Kafka scaler docs: https://keda.sh/docs/2.19/scalers/apache-kafka/
- KEDA RabbitMQ scaler docs: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- KEDA migration guide: https://keda.sh/docs/2.16/migration/
- NATS on Kubernetes docs: https://docs.nats.io/running-a-nats-service/nats-kubernetes
- NATS monitoring docs: https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- NATS clustering troubleshooting and CLI references: https://docs.nats.io/running-a-nats-service/configuration/clustering/jetstream_clustering/troubleshooting

## Issues Found
- RabbitMQ pod names were incorrect for Operator-managed clusters. The post used pod names like `rabbitmq-prod-0`, but the operator creates pods with the `-server-` suffix. I corrected the examples to use `rabbitmq-prod-server-0` and `rabbitmq-prod-server-4`.
- The RabbitMQ quorum queue rebalance commands used `rabbitmqctl grow_quorum_queue`, which is not the current documented queue membership workflow. I replaced this with the supported `rabbitmq-queues grow` command and added a step to resolve the new node name from the new pod before growing queue membership.
- The Kafka rebalance section used `kafka-reassign-partitions.sh` in a way that would not work as written: the generated reassignment file was redirected on the local shell while later commands tried to read it from inside the pod. I replaced the section with Strimzi’s current `KafkaRebalance` workflow for `add-brokers` mode, including proposal review and approval.
- The Kafka examples used `apiVersion: kafka.strimzi.io/v1beta2` for `KafkaRebalance`, while the current Strimzi documentation uses `kafka.strimzi.io/v1`. I updated the manifests accordingly.
- The “Use Strimzi KafkaRebalance” section described automatic rebalancing with a plain `KafkaRebalance` resource, which is not sufficient for Strimzi auto-rebalancing. I converted it to a proper rebalance template with the `strimzi.io/rebalance-template: "true"` annotation and added the `Kafka` patch that references it through `spec.cruiseControl.autoRebalance`.
- The NATS verification command used `nats server report cluster`, which is not an official NATS CLI command. I replaced it with a supported `nats server ping` example from the `nats-box` utility pod and clarified that automatic joins depend on clustering routes being configured.
- The KEDA RabbitMQ scaler example used legacy `queueLength` metadata. I updated it to the current trigger shape using `mode: QueueLength` and `value`.
- The `kubectl events` example claimed to watch scaling events but did not include `--watch`. I added the flag so the command matches the description.

## Review Notes
- Strimzi’s newer deployments often scale brokers through `KafkaNodePool` resources. The post’s `Kafka.spec.kafka.replicas` example is still valid for deployments that are not using node pools.
- The HPA example is structurally correct for `autoscaling/v2`, but it requires an external metrics adapter that serves the `external.metrics.k8s.io` API.
- The NATS verification example assumes the official Helm deployment pattern that includes the `nats-box` utility pod.
