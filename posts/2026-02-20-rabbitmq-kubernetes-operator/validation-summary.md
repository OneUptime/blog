# Validation Summary: How to Deploy RabbitMQ on Kubernetes with the Cluster Operator

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- RabbitMQ
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ Messaging Topology Operator
- Kubernetes
- kubectl
- Prometheus Operator ServiceMonitor
- Python pika

## Sources Consulted
- RabbitMQ Cluster Operator installation documentation: https://www.rabbitmq.com/kubernetes/operator/install-operator
- RabbitMQ Cluster Operator usage and API fields: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Messaging Topology Operator installation documentation: https://www.rabbitmq.com/kubernetes/operator/install-topology-operator
- RabbitMQ Messaging Topology Operator usage documentation: https://www.rabbitmq.com/kubernetes/operator/using-topology-operator
- RabbitMQ Messaging Topology Operator CRD manifest: https://github.com/rabbitmq/messaging-topology-operator/releases/latest/download/messaging-topology-operator-with-certmanager.yaml
- RabbitMQ quorum queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ policies documentation: https://www.rabbitmq.com/docs/policies
- RabbitMQ virtual hosts and default queue type documentation: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ deprecated features list: https://www.rabbitmq.com/release-information/deprecated-features-list
- RabbitMQ release support information: https://www.rabbitmq.com/release-information
- RabbitMQ Cluster Operator ServiceMonitor example: https://raw.githubusercontent.com/rabbitmq/cluster-operator/main/observability/prometheus/monitors/rabbitmq-servicemonitor.yml

## Issues Found
- The post used `Policy`, `User`, and `Permission` resources but only installed the RabbitMQ Cluster Operator. Added installation of cert-manager and the RabbitMQ Messaging Topology Operator, which provides those CRDs.
- The policy example claimed to define high-availability quorum queues with a policy. RabbitMQ queue type is fixed at declaration time and cannot be set by policy, so the example now shows a valid quorum queue policy using `applyTo: "quorum_queues"` and `delivery-limit`.
- The `RabbitmqCluster` referenced `rabbitmq-tls-secret` without creating it. Added a `kubectl create secret tls` command before applying the cluster manifest.
- The `User` example imported credentials from `app-user-credentials` without defining that Secret. Added a Kubernetes Secret with `username` and `password` keys.
- The architecture diagram placed the Cluster Operator in the `messaging` namespace, but the default installation deploys it in `rabbitmq-system`. Updated the diagram.
- The production checklist said the PodDisruptionBudget is configured automatically. RabbitMQ's operator documentation describes creating a PDB explicitly, so the checklist now recommends creating one with `maxUnavailable: 1`.
- Reworded "single Custom Resource Definition" to "single custom resource" because users create a `RabbitmqCluster` custom resource; the CRD is the Kubernetes API extension installed by the operator.
- Updated the RabbitMQ container image from `rabbitmq:3.13-management` to `rabbitmq:4.3-management` because RabbitMQ 3.13 community support ended on September 30, 2024, while 4.3 is the current community-supported release series as of the validation date.

## Review Notes
- RabbitMQ 4.x quorum queues default to a delivery limit of 20; the policy example intentionally overrides this to 50 for matching quorum queues.
- The ServiceMonitor selector and `prometheus` port align with the RabbitMQ Cluster Operator labels and published monitoring example.
- `kubectl` was not installed in the local environment, so command verification was performed against official Kubernetes/RabbitMQ documentation and operator manifests rather than local `kubectl --help` output.
