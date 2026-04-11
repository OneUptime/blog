# Validation Summary: How to Set Up Redis Horizontal Pod Autoscaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7 (read replicas, replication)
- Kubernetes (Deployments, HorizontalPodAutoscaler, autoscaling/v2 API)
- Prometheus Adapter (custom metrics for HPA)
- Helm (prometheus-community charts)
- PromQL (metric queries)

## Sources Consulted
- Kubernetes HPA documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter Helm chart values: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Kubernetes custom metrics API: https://github.com/kubernetes/metrics#custom-metrics-api

## Issues Found

### 1. Invalid `seriesQuery` in Prometheus Adapter config (line 54)
- **What was wrong:** The second custom metrics rule used `rate(redis_commands_processed_total{kubernetes_namespace!=""}[2m])` as the `seriesQuery`. The `seriesQuery` field is used by the Prometheus Adapter for metric discovery — it must be a plain Prometheus series selector (metric name + label matchers), not a PromQL expression with functions like `rate()`. Using a PromQL function here would cause the adapter to fail to discover and register the metric.
- **What was changed:** Replaced with `redis_commands_processed_total{kubernetes_namespace!=""}` — the plain series selector. The `rate()` computation is already correctly placed in the `metricsQuery` field.
- **Why:** Per the Prometheus Adapter configuration docs, `seriesQuery` is a Prometheus series selector used to find metrics via the `/api/v1/series` endpoint, which does not accept PromQL functions.

## Review Notes
- The `$(REDIS_PASSWORD)` env var substitution in the Deployment command array is valid Kubernetes syntax — Kubernetes performs variable expansion in `command` and `args` fields before container start. However, passing passwords as command-line arguments means they are visible in `kubectl describe pod` and `/proc/<pid>/cmdline`. A production deployment should consider using a Redis config file mounted from a Secret instead.
- The custom metrics API path in the verification section uses `v1beta1` (`/apis/custom.metrics.k8s.io/v1beta1/...`), which is correct and still the current API version for the custom metrics API.
- The `redis_ops_per_second` metric is configured in the Prometheus Adapter but not used in the HPA definition. This is not an error — it's available for future use — but readers may expect to see it referenced in the HPA.
- The overall architecture (Deployment for replicas + HPA with custom metrics + Prometheus Adapter) is a well-established pattern and technically sound.
