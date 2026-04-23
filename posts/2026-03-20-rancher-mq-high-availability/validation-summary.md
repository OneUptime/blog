# Validation Summary: How to Configure Message Queue High Availability in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ quorum queues
- RabbitMQ federation
- Apache Kafka
- Strimzi
- NATS JetStream
- Prometheus / PrometheusRule
- PodDisruptionBudget

## Sources Consulted
- RabbitMQ Quorum Queues: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Virtual Hosts and default queue type: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ Cluster Kubernetes Operator usage: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ quorum status monitoring: https://www.rabbitmq.com/kubernetes/operator/quorum-status
- RabbitMQ Federation: https://www.rabbitmq.com/docs/federation
- RabbitMQ Prometheus monitoring: https://www.rabbitmq.com/docs/next/prometheus
- Strimzi Deploying and Managing 0.51.0: https://strimzi.io/docs/operators/0.51.0/deploying
- Strimzi downloads / supported versions: https://strimzi.io/downloads/
- NATS JetStream streams: https://docs.nats.io/nats-concepts/jetstream/streams
- NATS JetStream clustering administration: https://docs.nats.io/running-a-nats-service/configuration/clustering/jetstream_clustering/administration
- NATS official Helm chart values: https://raw.githubusercontent.com/nats-io/k8s/main/helm/charts/nats/values.yaml

## Issues Found
- The description and RabbitMQ explanation overstated guarantees with phrases like "ensure zero message loss" and "guaranteed delivery". These were softened to durability-focused wording because RabbitMQ quorum queues provide strong data safety, but not absolute no-loss guarantees in every scenario.
- The RabbitMQ config used invalid or outdated keys. `queue.default_queue_type` was corrected to `default_queue_type`, and `quorum_queue.initial_cluster_size.min` was corrected to `quorum_queue.initial_cluster_size`.
- The RabbitMQ API example assumed `localhost:15672` without explaining access to the management endpoint. A port-forward note was added so the command is runnable in a Rancher/Kubernetes context.
- The Kafka section used a ZooKeeper-era Strimzi example (`v1beta2`, `zookeeper`, no listeners) that is no longer current for modern Strimzi releases. It was replaced with a current Strimzi `v1` KRaft-based example using `Kafka` plus `KafkaNodePool`, required listeners, current Kafka versioning, and an enabled Entity Operator so the later `KafkaTopic` example is valid.
- The Kafka topic example was updated from `kafka.strimzi.io/v1beta2` to `kafka.strimzi.io/v1` to match current Strimzi resource versions.
- The NATS Helm values snippet used an incorrect pod anti-affinity shape for the official chart. It was corrected to the chart-supported `podTemplate.topologySpreadConstraints` structure.
- The NATS CLI example used `nats stream create`; official docs use `nats stream add` for stream creation. The command was updated accordingly, and `--server` was moved into the standard global-flag position.
- The cross-region RabbitMQ federation section described federation as HA. It was reframed as cross-region disaster recovery because federation is asynchronous cluster-to-cluster message movement/replication, not synchronous in-cluster HA.
- The monitoring section used RabbitMQ and Kafka metrics that were not appropriate as written. RabbitMQ alerts were updated to documented Raft metrics and standard Prometheus `up` semantics with scope notes, and Kafka alerts were updated to Kafka Exporter metrics with `kafkaExporter: {}` enabled in the cluster example.
- The Kafka PodDisruptionBudget example needed qualification because modern Strimzi generates Kafka PDBs automatically by default. The post now makes the manual Kafka PDB conditional on managing PDBs manually / disabling automatic generation.

## Review Notes
- RabbitMQ per-queue and Raft alerting requires scraping per-object or detailed metrics rather than relying only on the default aggregated `/metrics` endpoint.
- The Kafka monitoring rules in the post now assume Kafka Exporter metrics are present; the cluster example enables `kafkaExporter: {}` for that reason.
- The Kafka example now reflects current Strimzi guidance as of April 23, 2026: modern Strimzi releases use KRaft-based Kafka deployments instead of ZooKeeper-based ones.
