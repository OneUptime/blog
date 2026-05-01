# Validation Summary: How to Deploy RabbitMQ on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- RabbitMQ
- AMQP 0-9-1
- Prometheus
- Prometheus Operator

## Sources Consulted
- Bitnami RabbitMQ chart README: https://github.com/bitnami/charts/blob/main/bitnami/rabbitmq/README.md
- Bitnami RabbitMQ chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/rabbitmq/values.yaml
- RabbitMQ Management CLI docs: https://www.rabbitmq.com/docs/management-cli
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/4.2/http-api-reference
- RabbitMQ Clustering Guide: https://www.rabbitmq.com/docs/clustering
- RabbitMQ Cluster Formation and Peer Discovery: https://www.rabbitmq.com/docs/4.1/cluster-formation
- RabbitMQ Exchanges guide: https://www.rabbitmq.com/docs/next/exchanges
- RabbitMQ AMQP 0-9-1 model explained: https://www.rabbitmq.com/tutorials/amqp-concepts
- RabbitMQ URI specification: https://www.rabbitmq.com/docs/4.2/uri-spec
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/#port-forward

## Issues Found
- The post described the deployment as "production-ready" and "HA" without clarifying that RabbitMQ clustering alone does not replicate queue contents in RabbitMQ 4.x. I corrected the description, replica comment, and conclusion to avoid overstating queue-level availability and added the needed note that quorum queues or streams are required for replicated message data.
- The values snippet used `metrics.serviceMonitor.enabled`, but the current Bitnami chart documents `metrics.serviceMonitor.default.enabled` and related per-endpoint keys. I updated the snippet to the current key path.
- The values snippet manually set `plugins` to include `rabbitmq_prometheus`, but the current Bitnami chart enables the Prometheus plugin when `metrics.enabled=true` and recommends not using `plugins` to add plugins. I removed the incorrect plugin override.
- The test-queue step assumed `rabbitmqadmin` was available inside the pod. Current RabbitMQ docs document `rabbitmqadmin` as a separate tool and the management API as the authoritative interface. I replaced that section with verified RabbitMQ HTTP API examples for declaring a queue, declaring an exchange, binding, publishing, and retrieving a message.
- The application connectivity section incorrectly referred to the headless service, while the example URI used the normal service. I corrected the text to reference the ClusterIP service.
- The AMQP URI example omitted the virtual host path. I updated it to include the default virtual host as `/%2f`, which matches RabbitMQ's URI specification.

## Review Notes
- `helm repo add bitnami https://charts.bitnami.com/bitnami` remains usable, but current Bitnami chart documentation targets Helm 3.8+ and OCI-backed chart distribution.
- The RabbitMQ HTTP API is appropriate for validation and troubleshooting, but RabbitMQ documents it as inefficient for production publishing workflows.
- Queue-level high availability in RabbitMQ 4.x depends on replicated data types such as quorum queues or streams, not only on running multiple broker pods.
