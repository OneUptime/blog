# Validation Summary: How to Scale Message Queue Clusters in Rancher - Message Queue Clusters

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Kubernetes StatefulSets
- kubectl
- Apache Kafka brokers and partition reassignment
- RabbitMQ clusters and quorum queues
- KEDA ScaledObject
- KEDA Kafka scaler
- KEDA RabbitMQ scaler

## Sources Consulted
- SUSE Rancher Manager docs: Access a Cluster with Kubectl and kubeconfig - https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.10/en/cluster-admin/manage-clusters/access-clusters/use-kubectl-and-kubeconfig.html
- Kubernetes docs: Scale a StatefulSet - https://kubernetes.io/docs/tasks/run-application/scale-stateful-set/
- Kubernetes docs: kubectl scale reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes docs: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Apache Kafka docs: Basic Kafka Operations, expanding clusters and partition reassignment - https://kafka.apache.org/42/operations/basic-kafka-operations/
- RabbitMQ docs: Cluster Formation and Peer Discovery - https://www.rabbitmq.com/docs/cluster-formation
- RabbitMQ docs: Quorum Queues, replication factor and membership management - https://www.rabbitmq.com/docs/quorum-queues
- KEDA docs: ScaledObject specification - https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA docs: Apache Kafka scaler - https://keda.sh/docs/2.19/scalers/apache-kafka/
- KEDA docs: RabbitMQ Queue scaler - https://keda.sh/docs/2.19/scalers/rabbitmq-queue/

## Issues Found
- The Kafka reassignment section implied that `reassignment.json` was available immediately after running `kafka-reassign-partitions.sh --generate`. Apache Kafka documents that `--generate` prints the current and proposed assignments, and the proposed assignment must be saved before running `--execute`. Added a sentence telling readers to save the proposed reassignment JSON before execution.
- The RabbitMQ section said RabbitMQ uses quorum queues for HA and only showed scaling the StatefulSet. RabbitMQ supports quorum queues, but existing quorum queues do not automatically add replicas on newly added nodes. Updated the wording and added `rabbitmq-queues grow` commands for the new nodes.
- The KEDA introduction described all autoscaling as queue-depth based. Kafka scaling is based on consumer lag, so the wording now mentions queue depth or Kafka consumer lag.
- The KEDA comments over-simplified `lagThreshold` and RabbitMQ `value` as one-time scale-up thresholds. Updated the comments to describe them as target values used for scaling.
- The conclusion overstated KEDA as ensuring capacity always matches queue depth and preventing backlogs. Reworded it to say KEDA helps capacity follow queue depth or lag and reduces backlogs.

## Review Notes
The Kubernetes, Kafka, RabbitMQ, and KEDA command and YAML syntax is valid against current official documentation. The example StatefulSet, pod, service, topic, queue, and RabbitMQ node names remain deployment-specific; readers need to substitute the names used by their Rancher-managed cluster or Helm chart.
