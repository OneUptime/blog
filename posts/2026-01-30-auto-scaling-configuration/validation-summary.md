# Validation Summary: How to Build Auto-Scaling Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Kubernetes Vertical Pod Autoscaler (VPA)
- Kubernetes Metrics Server
- KEDA ScaledObject and ScaledJob
- Prometheus Adapter
- Prometheus Operator PrometheusRule
- PromQL
- Helm

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Metrics Server documentation: https://github.com/kubernetes-sigs/metrics-server
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- KEDA deployment documentation: https://keda.sh/docs/2.20/deploy/
- KEDA ScaledObject specification: https://keda.sh/docs/2.20/reference/scaledobject-spec/
- KEDA ScaledJob specification: https://keda.sh/docs/2.20/reference/scaledjob-spec/
- KEDA Kafka scaler documentation: https://keda.sh/docs/2.20/scalers/apache-kafka/
- KEDA RabbitMQ scaler documentation: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.20/scalers/prometheus/
- KEDA Cron scaler documentation: https://keda.sh/docs/2.20/scalers/cron/
- KEDA Prometheus integration metrics documentation: https://keda.sh/docs/2.20/integrations/prometheus/
- Prometheus Operator API reference for PrometheusRule: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md

## Issues Found
- The VPA example used `updateMode: "Auto"`, which current Kubernetes documentation marks as deprecated. Changed the example to `updateMode: "Recreate"` and updated the supported-mode comments to include the current VPA modes.
- The Prometheus Adapter queue metric rule did not associate the metric with the Service used by the HPA Object metric. Added a `service` label/resource mapping and grouped the query by `namespace, service`.
- The Prometheus Adapter histogram quantile query did not aggregate buckets by `le`, which would make the p99 query incorrect. Wrapped the rate query in `sum(...) by (le, namespace, pod)`.
- The RabbitMQ KEDA example included a literal credential-bearing `host` value and defined a `TriggerAuthentication` that was not referenced. Replaced the literal host with `protocol: amqp` and added `authenticationRef: rabbitmq-auth`.
- The weekend KEDA cron trigger ended at 23:00 on weekend days, leaving the final hour uncovered. Changed it to run from Saturday 00:00 through Monday 00:00.
- The combined KEDA example used `idleReplicaCount: 1`; KEDA documents that only `0` is supported for this field due to HPA limitations. Removed the field so `minReplicaCount: 2` controls idle behavior.
- The VPA recommendation drift PromQL joined VPA recommendations to pod resource requests on `target_name`, which is not present on the pod resource request metric. Changed the query to compare by `namespace` and `container`.
- The KEDA scaler error alert used `keda_scaler_errors_total`, but current KEDA exposes `keda_scaler_detail_errors_total`. Updated the alert expression accordingly.

## Review Notes
- All YAML code fences parse successfully after the fixes.
- KEDA and Kubernetes autoscaling behavior is version-sensitive. The post now aligns with current Kubernetes and KEDA documentation as of 2026-06-12, but readers should still confirm feature-gate-dependent VPA modes before using in-place resizing in production.
