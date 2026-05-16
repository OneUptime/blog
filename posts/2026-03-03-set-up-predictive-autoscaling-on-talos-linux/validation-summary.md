# Validation Summary: How to Set Up Predictive Autoscaling on Talos Linux

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Talos Linux
- Kubernetes HorizontalPodAutoscaler
- Kubernetes CronJob
- KEDA ScaledObject
- KEDA Cron scaler
- KEDA Prometheus scaler
- Prometheus / PromQL
- Python
- kubectl

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- KEDA Cron scaler documentation: https://keda.sh/docs/2.19/scalers/cron/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.19/scalers/prometheus/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Talos Linux FAQ: https://www.talos.dev/v1.11/learn-more/faqs/

## Issues Found
- The Kubernetes CronJob examples described New York wall-clock times but did not set `.spec.timeZone`, so Kubernetes would interpret schedules in the kube-controller-manager local timezone. Added `timeZone: "America/New_York"` to both CronJobs.
- The KEDA Prometheus examples used `metricName`, which is not part of the current KEDA 2.19 Prometheus scaler trigger metadata. Removed the obsolete metadata lines.
- The Python historical traffic query intended to look 15 minutes ahead of the same time last week, but calculated `168 - 15 = 153m` instead of one week minus 15 minutes. Fixed the offset calculation to `7 * 24 * 60 - hours_ahead * 60`.
- The HPA example used the old `autoscaling.alpha.kubernetes.io/behavior` annotation with `autoscaling/v2`. Moved the setting to `spec.behavior.scaleUp.stabilizationWindowSeconds`, which is the current stable API field.

## Review Notes
The examples are technically valid after correction, but they remain illustrative. A production setup should also include RBAC for the service accounts, pinned container image tags instead of `latest`, and coordination rules if KEDA, direct `kubectl scale`, and an HPA all manage the same target.
