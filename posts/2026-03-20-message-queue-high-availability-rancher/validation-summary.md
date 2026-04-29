# Validation Summary: How to Configure Message Queue High Availability in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- StatefulSets
- Pod anti-affinity
- Topology spread constraints
- PodDisruptionBudget
- RabbitMQ
- Apache Kafka
- Longhorn
- Kubernetes readiness probes

## Sources Consulted
- Kubernetes: Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes: Disruptions: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes: Specifying a Disruption Budget for your Application: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes: Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes: Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- RabbitMQ: Reliability Guide: https://www.rabbitmq.com/docs/reliability
- RabbitMQ: Quorum Queues: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ: Monitoring: https://www.rabbitmq.com/docs/4.1/monitoring
- RabbitMQ: Deploying to Kubernetes (Do It Yourself): https://www.rabbitmq.com/docs/next/install-kubernetes-diy
- RabbitMQ Cluster Kubernetes Operator: Using the Operator: https://www.rabbitmq.com/kubernetes/operator/using-operator
- Apache Kafka: Design: https://kafka.apache.org/42/design/design/
- Apache Kafka: Topic Configs: https://kafka.apache.org/42/configuration/topic-configs/
- Longhorn: Storage Class Parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Rancher: Cloud Native Storage with Longhorn: https://ranchermanager.docs.rancher.com/integrations-in-rancher/longhorn

## Issues Found
- The introduction implied Kubernetes placement and storage settings were sufficient for message queue HA. I updated it to clarify that these settings complement, but do not replace, broker-native replication such as RabbitMQ quorum queues or Kafka topic replication.
- The HA diagram labeled all inter-node links as `Replication`, which was too broad and misleading for generic RabbitMQ/Kafka guidance. I changed those links to `Cluster traffic`.
- The anti-affinity and topology spread YAML fragments were positioned as StatefulSet snippets but were missing the required `spec.template.spec` nesting. I corrected the YAML so the fragments map to valid StatefulSet structure.
- The topology spread section assumed zone spreading would always work. I clarified that nodes must carry the `topology.kubernetes.io/zone` label, matching Kubernetes scheduling behavior.
- The PodDisruptionBudget explanation overstated what PDBs do. I corrected the wording to state that PDBs limit voluntary disruptions and added label comments so the selector is not read as a fixed RabbitMQ value.
- The storage section presented a Longhorn-specific `StorageClass` as if it were generic Rancher storage. I updated the text to state explicitly that the example applies when the Rancher cluster uses Longhorn, and I corrected the `reclaimPolicy` comment to describe PV retention accurately.
- The resource requests section claimed requests ensure pods can always be scheduled and labeled memory requests as a guaranteed allocation. I changed the wording and comments to reflect actual Kubernetes scheduler behavior.
- The RabbitMQ probe section used CLI-based exec probes and described them generically as load-balancing health checks. I replaced that with the current RabbitMQ-recommended TCP readiness probe pattern, noted `podManagementPolicy: Parallel`, and aligned the explanation with Kubernetes readiness semantics.

## Review Notes
- The post is technically sound after the fixes above.
- The RabbitMQ-specific probe guidance assumes the AMQP listener is on port `5672`; TLS-only deployments would typically probe `5671` instead.
- The post still uses Kafka as a tag-level example only. A future revision could add Kafka-specific HA settings such as topic replication factor and `min.insync.replicas`.
