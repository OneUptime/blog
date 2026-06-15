# Validation Summary: How to Deploy RabbitMQ on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- RabbitMQ
- RabbitMQ Cluster Kubernetes Operator
- Kubernetes StatefulSets, Services, Secrets, RBAC, Pod Disruption Budgets
- Helm
- Bitnami RabbitMQ Helm chart
- Prometheus ServiceMonitor
- Python pika client

## Sources Consulted
- RabbitMQ Cluster Kubernetes Operator documentation: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Cluster Operator API reference: https://github.com/rabbitmq/cluster-operator/wiki/API_Reference
- RabbitMQ cluster formation and Kubernetes peer discovery documentation: https://www.rabbitmq.com/docs/cluster-formation
- RabbitMQ clustering guide: https://www.rabbitmq.com/docs/clustering
- RabbitMQ quorum queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ classic queue mirroring deprecation documentation: https://www.rabbitmq.com/docs/3.13/ha
- RabbitMQ schema definition export/import documentation: https://www.rabbitmq.com/docs/definitions
- RabbitMQ command line tools documentation: https://www.rabbitmq.com/docs/cli
- Bitnami RabbitMQ Helm chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/rabbitmq/values.yaml
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The RabbitMQ Cluster Operator manifest had two `rabbitmq:` keys under `spec`, which would cause one block to override the other in YAML parsing. Merged `additionalConfig` and `additionalPlugins` into a single `rabbitmq:` block.
- The operator example listed `rabbitmq_management` and `rabbitmq_prometheus` as additional plugins even though the Cluster Operator enables management, Prometheus, and Kubernetes peer discovery as essential plugins by default. Removed those duplicate entries and kept only Shovel plugins as additional plugins.
- The Helm values-file install command omitted `--create-namespace`, unlike the preceding install command. Added it so the command works when the namespace does not already exist.
- The manual StatefulSet example used RabbitMQ `3.12-management`, which is outdated for a current Kubernetes deployment guide. Updated it to `rabbitmq:4-management`.
- The manual RabbitMQ config used deprecated `queue_master_locator = min-masters`. Replaced it with the current `queue_leader_locator = balanced`.
- The manual Kubernetes peer discovery config included older Kubernetes peer discovery settings that current RabbitMQ documentation no longer requires for the common StatefulSet case. Removed the obsolete `cluster_formation.k8s.*` settings and kept the peer discovery backend plus plugin enablement.
- The manual StatefulSet set `RABBITMQ_NODENAME` to only the pod name while enabling long node names. Updated it to a full long RabbitMQ node name based on the pod DNS name.
- The Prometheus `ServiceMonitor` selected services with `app: rabbitmq`, but the Service objects had no matching labels and no `prometheus` port. Added service labels and the named `prometheus` port on the Services and container.
- The Python connection example used a password that did not match the manual Secret shown in the post. Updated it to `changeme123`.

## Review Notes
- YAML code blocks were parsed successfully with PyYAML after the edits.
- `kubectl` and `helm` were not installed in the local environment, so command behavior was checked against official documentation rather than local CLI help.
- The manual StatefulSet is still more operationally risky than the Cluster Operator path; the post already recommends the operator for most deployments.
