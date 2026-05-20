# Validation Summary: How to Deploy KEDA ScaledObjects with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- KEDA
- Helm
- Kustomize
- RabbitMQ
- AWS SQS
- Kafka
- Prometheus
- Redis

## Sources Consulted
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA RabbitMQ scaler documentation: https://keda.sh/docs/2.13/scalers/rabbitmq-queue/ and https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- KEDA authentication documentation: https://keda.sh/docs/2.19/concepts/authentication/
- KEDA AWS SQS scaler documentation: https://keda.sh/docs/2.19/scalers/aws-sqs/
- KEDA Apache Kafka scaler documentation: https://keda.sh/docs/2.19/scalers/apache-kafka/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.19/scalers/prometheus/
- KEDA Redis Lists scaler documentation: https://keda.sh/docs/2.19/scalers/redis-lists/
- KEDA Cron scaler documentation: https://keda.sh/docs/2.19/scalers/cron/
- KEDA CPU scaler documentation: https://keda.sh/docs/2.19/scalers/cpu/
- KEDA Helm chart values for v2.13.0: https://raw.githubusercontent.com/kedacore/charts/v2.13.0/keda/values.yaml
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/

## Issues Found
- Fixed the KEDA Helm values key from `resources.metricsApiServer` to `resources.metricServer`, matching the v2.13.0 chart values.
- Fixed `podAnnotations` to use the chart's component-specific keys (`keda` and `metricsAdapter`) instead of putting Prometheus annotations directly under `podAnnotations`.
- Replaced deprecated RabbitMQ scaler `queueLength` metadata with `mode: QueueLength` and `value`, as documented for KEDA v2.13 and later.
- Added trailing slashes to RabbitMQ AMQP connection strings without explicit vhosts, matching KEDA's RabbitMQ host format requirements.
- Clarified that secrets referenced by `ClusterTriggerAuthentication` are loaded from the KEDA namespace by default unless `KEDA_CLUSTER_OBJECT_NAMESPACE` is configured.
- Removed `metricName` from the Prometheus scaler example because it is not part of the documented KEDA Prometheus scaler metadata.
- Removed `idleReplicaCount: 0` from the scale-to-zero example because `idleReplicaCount` must be less than `minReplicaCount`, so it is not valid with `minReplicaCount: 0`.
- Corrected the Deployment health check to rely on a user-provided stable label instead of `scaledobject.keda.sh/name`, which KEDA does not add to target Deployments.
- Removed ignore rules for KEDA-added Deployment labels and annotations because KEDA does not add those fields to the target Deployment.
- Replaced `string.format` in Argo CD Lua health checks so the snippets work without enabling Lua standard libraries.

## Review Notes
The post is now technically valid for the KEDA chart version it references. KEDA 2.13.0 is not the latest KEDA release as of this review date, but the examples avoid deprecated RabbitMQ metadata and align with current scaler documentation where applicable.
