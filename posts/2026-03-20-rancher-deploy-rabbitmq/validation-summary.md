# Validation Summary: How to Deploy RabbitMQ on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RabbitMQ
- RabbitMQ Cluster Kubernetes Operator
- Helm
- Prometheus Operator / ServiceMonitor
- AMQP

## Sources Consulted
- RabbitMQ Cluster Operator install guide: https://www.rabbitmq.com/kubernetes/operator/install-operator
- RabbitMQ Cluster Operator usage guide: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Cluster Operator monitoring guide: https://www.rabbitmq.com/kubernetes/operator/operator-monitoring
- RabbitMQ Cluster Operator troubleshooting guide: https://www.rabbitmq.com/kubernetes/operator/troubleshooting-operator
- RabbitMQ release information: https://www.rabbitmq.com/release-information
- RabbitMQ configuration guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ consumer prefetch guide: https://www.rabbitmq.com/docs/consumer-prefetch
- RabbitMQ quorum queues guide: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ dead letter exchanges guide: https://www.rabbitmq.com/docs/3.13/dlx
- RabbitMQ dynamic shovel guide: https://www.rabbitmq.com/docs/3.13/shovel-dynamic
- RabbitMQ URI specification: https://www.rabbitmq.com/docs/3.13/uri-spec
- RabbitMQ HTTP API reference: https://blog.rabbitmq.com/docs/next/http-api-reference
- Kubernetes dependent environment variables guide: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Rancher ServiceMonitor and PodMonitor reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Bitnami Helm charts repository: https://github.com/bitnami/charts

## Issues Found
- The post pinned `rabbitmq:3.13-management`, which was already out of community support by the validation date. Updated the sample to `rabbitmq:4.2-management`, which is a supported RabbitMQ release series.
- The post placed `default_consumer_prefetch` in `additionalConfig`, but RabbitMQ documents this setting in `advanced.config` format rather than `rabbitmq.conf` format. Moved it into `advancedConfig` with the correct Erlang syntax.
- The application secret referenced by the sample `Deployment` did not exist anywhere in the walkthrough. Added an idempotent `kubectl create secret ... --dry-run=client -o yaml | kubectl apply -f -` command to create `rabbitmq-app-credentials` in the application namespace.
- The `orders.dlq` queue was created, but the `orders` queue was not configured to dead-letter to it. Added `x-dead-letter-exchange` and `x-dead-letter-routing-key` arguments so the DLQ is actually used.
- The `Deployment` manifest in Step 5 was invalid because it omitted `spec.selector` and matching pod template labels. Added the required selector and labels.
- The troubleshooting commands used pod names that do not match RabbitMQ Cluster Operator naming conventions. Updated them from `rabbitmq-prod-0` style names to `rabbitmq-prod-server-0` / `rabbitmq-prod-server-1`, and corrected the `join_cluster` target node name accordingly.
- The Helm install example used the older chart-repository form. Updated it to the current OCI-based Bitnami chart install command and tightened the prerequisite to Helm 3.8+ for that path.

## Review Notes
- The RabbitMQ Cluster Operator already enables the Prometheus, Kubernetes peer discovery, and management plugins by default, so explicitly listing `rabbitmq_prometheus` is redundant but still valid.
- The queue arguments used in the post are technically valid, but RabbitMQ recommends policies over hardcoded queue `x-arguments` for settings such as dead-lettering and delivery limits when you want those settings to remain easy to change later.
- The `ServiceMonitor` label requirements can vary depending on how Rancher monitoring was installed and how its Prometheus resource selects `ServiceMonitor` objects. The example is plausible for Rancher-managed monitoring, but some environments may require selector-label adjustments.
