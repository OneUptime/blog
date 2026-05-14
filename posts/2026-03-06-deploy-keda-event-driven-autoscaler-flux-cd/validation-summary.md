# Validation Summary: How to Deploy KEDA Event-Driven Autoscaler with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- KEDA
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository
- ScaledObject and ScaledJob
- RabbitMQ, Kafka, Prometheus, and cron scalers
- kubectl

## Sources Consulted
- KEDA 2.16 RabbitMQ scaler documentation: https://keda.sh/docs/2.16/scalers/rabbitmq-queue/
- KEDA 2.16 Apache Kafka scaler documentation: https://keda.sh/docs/2.16/scalers/apache-kafka/
- KEDA 2.16 Prometheus scaler documentation: https://keda.sh/docs/2.16/scalers/prometheus/
- KEDA 2.16 Cron scaler documentation: https://keda.sh/docs/2.16/scalers/cron/
- KEDA 2.16 CPU scaler documentation: https://keda.sh/docs/2.16/scalers/cpu/
- KEDA 2.16 ScaledObject specification: https://keda.sh/docs/2.16/reference/scaledobject-spec/
- KEDA 2.16 ScaledJob specification: https://keda.sh/docs/2.16/reference/scaledjob-spec/
- KEDA 2.16 metrics server documentation: https://keda.sh/docs/2.16/operate/metrics-server/
- KEDA Helm chart values for chart 2.16.1: https://kedacore.github.io/charts/keda-2.16.1.tgz
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The KEDA Helm values placed resource requests and limits under `operator.resources`, `metricsServer.resources`, and `webhooks.resources`. The KEDA 2.16 chart expects these under top-level `resources.operator`, `resources.metricServer`, and `resources.webhooks`, so the values block was corrected.
- The RabbitMQ ScaledObject and ScaledJob examples used the deprecated `queueLength` metadata field. Updated them to use `mode: QueueLength` with `value`, as recommended by the KEDA 2.16 RabbitMQ scaler documentation.
- The RabbitMQ ScaledObject included an inline `host` while also using `TriggerAuthentication`. Removed the inline credential-bearing host and made the trigger rely on the `TriggerAuthentication` secret reference.
- The Kafka authentication comment described TLS authentication, but the example only configured SASL credentials. Updated the comment to accurately describe SASL authentication.
- The Flux Kustomization example was shown as `clusters/my-cluster/keda/kustomization.yaml`, which would conflict with Flux's handling of a Kustomize `kustomization.yaml` at the reconciled path. Moved the example to `clusters/my-cluster/flux-system/keda-kustomization.yaml` in the post and repository structure.
- The Flux Kustomization used `wait: true` with explicit `healthChecks`, but Flux ignores `healthChecks` when `wait` is enabled. Removed `wait: true` and changed the health check to wait for the `HelmRelease`, which is the resource applied by that Flux Kustomization.
- The external metrics troubleshooting command used a hard-coded metric path without the KEDA label selector. Replaced it with the documented flow: read `.status.externalMetricNames`, then query the metric with the `scaledobject.keda.sh/name` label selector.

## Review Notes
- The YAML examples parse successfully after the fixes.
- The local environment does not have `helm`, `kubectl`, or `flux` installed, so CLI verification was performed against official documentation and chart sources rather than local command help.
