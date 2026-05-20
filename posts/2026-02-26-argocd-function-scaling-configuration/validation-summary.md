# Validation Summary: How to Handle Function Scaling Configuration with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications, sync waves, automated sync, and sync options
- Knative Serving autoscaling with KPA and HPA classes
- KEDA ScaledObjects, TriggerAuthentication, RabbitMQ, and Kafka scalers
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Prometheus Operator PrometheusRule resources
- kube-state-metrics and KEDA Prometheus metrics

## Sources Consulted
- Knative Serving autoscaling overview: https://knative.dev/docs/serving/autoscaling/
- Knative supported autoscaler types: https://knative.dev/docs/serving/autoscaling/autoscaler-types/
- Knative scale-to-zero configuration: https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Knative concurrency and target configuration: https://knative.dev/docs/serving/autoscaling/concurrency/
- Knative RPS target configuration: https://knative.dev/docs/serving/autoscaling/rps-target/
- Knative scale bounds and activation scale: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Knative KPA-specific windows and scale rates: https://knative.dev/docs/serving/autoscaling/kpa-specific/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA RabbitMQ scaler: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- KEDA Kafka scaler: https://keda.sh/docs/2.19/scalers/apache-kafka/
- KEDA authentication: https://keda.sh/docs/2.19/concepts/authentication/
- KEDA Prometheus integration metrics: https://keda.sh/docs/2.19/integrations/prometheus/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- Removed the global `activation-scale` key from the Knative `config-autoscaler` ConfigMap. Knative documents activation scale as a per-revision annotation, not a global ConfigMap key.
- Corrected the batch processor comment for `autoscaling.knative.dev/scale-to-zero-pod-retention-period`. This setting retains the last pod after the autoscaler has selected scale-to-zero; it is not itself the inactivity timer.
- Removed `idleReplicaCount: 0` from the KEDA example with `minReplicaCount: 0`. KEDA documents `idleReplicaCount` as needing to be less than `minReplicaCount`, and omitting it is the normal scale-to-zero configuration when `minReplicaCount` is `0`.
- Removed the CPU trigger from the RabbitMQ KEDA example. The original comment claimed CPU scaling during business hours, but there was no cron/time condition, and KEDA fallback is not supported for CPU and memory triggers.
- Replaced `autoscaling.knative.dev/initial-scale` with `autoscaling.knative.dev/activation-scale` in the burst handling example. `initial-scale` applies when a Revision is created; `activation-scale` controls the minimum scale when activating from zero.
- Removed the per-service `autoscaling.knative.dev/max-scale-up-rate` annotation from the burst handling example. Knative documents `max-scale-up-rate` as a global ConfigMap setting with no per-revision annotation.
- Updated the max-scale Prometheus alert to compare current HPA replicas against HPA max replicas instead of comparing Deployment status replicas to Deployment spec replicas.
- Updated the KEDA error alert metric from `keda_scaler_errors_total` to the current documented `keda_scaled_object_errors_total`.

## Review Notes
All YAML snippets were parsed successfully after edits. The Prometheus alerts assume kube-state-metrics and KEDA operator metrics are scraped with the metric names used in the examples.
