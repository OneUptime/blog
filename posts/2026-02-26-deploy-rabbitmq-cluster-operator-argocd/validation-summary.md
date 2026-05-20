# Validation Summary: How to Deploy RabbitMQ Cluster Operator with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ Messaging Topology Operator
- RabbitMQ quorum queues and policies
- Kubernetes custom resources
- Argo CD Applications and custom health checks
- Prometheus Operator ServiceMonitor
- Kustomize

## Sources Consulted
- RabbitMQ Cluster Operator installation documentation: https://www.rabbitmq.com/kubernetes/operator/install-operator
- RabbitMQ Cluster Operator usage and API field documentation: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Messaging Topology Operator installation documentation: https://www.rabbitmq.com/kubernetes/operator/install-topology-operator
- RabbitMQ Messaging Topology Operator usage documentation: https://www.rabbitmq.com/kubernetes/operator/using-topology-operator
- RabbitMQ Messaging Topology Operator API reference: https://pkg.go.dev/github.com/rabbitmq/messaging-topology-operator/api/v1beta1
- RabbitMQ quorum queue documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ classic queue mirroring documentation: https://www.rabbitmq.com/docs/3.13/ha
- RabbitMQ Prometheus monitoring documentation: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Kubernetes Operator monitoring documentation: https://www.rabbitmq.com/kubernetes/operator/operator-monitoring
- Argo CD custom health check documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The post installed only the RabbitMQ Cluster Operator but later used topology resources such as `Policy`, `User`, `Permission`, `Exchange`, `Queue`, and `Binding`. Added the Messaging Topology Operator manifest and its cert-manager prerequisite.
- The introductory claim implied that the Cluster Operator manages quorum queue topology. Updated it to distinguish Cluster Operator responsibilities from Messaging Topology Operator responsibilities.
- The prerequisites listed Kubernetes 1.24+, while current RabbitMQ operator documentation recommends Kubernetes 1.25 or later. Updated the prerequisite wording.
- The policy example used classic mirrored queue policy keys (`ha-mode`, `ha-params`, `ha-sync-mode`). Classic queue mirroring is deprecated in RabbitMQ 3.13 and removed in RabbitMQ 4.0, and the post otherwise recommends quorum queues. Replaced it with a quorum queue policy using `queue-leader-locator: balanced`.
- The monitoring example used a `PodMonitor` for RabbitMQ nodes, while the official RabbitMQ Kubernetes monitoring manifest uses a `ServiceMonitor` for RabbitMQ clusters. Updated the snippet to a `ServiceMonitor` with the RabbitMQ service labels and `prometheus` port.
- The operator installation text referenced a VMware Tanzu Helm repository as an operator source, but the guide uses official GitHub release manifests. Reworded the sentence to match the actual installation method.

## Review Notes
- The YAML snippets parse successfully after the edits.
- The guide pins the Cluster Operator manifest to `v2.10.0`. That is acceptable for a reproducible GitOps example, but future updates should review newer operator release notes before changing the pinned version.
- The topology operator manifest is referenced through the official `latest` URL because the official installation documentation uses that URL. For production GitOps repositories, pinning a specific topology operator release is usually preferable.
