# Validation Summary: How to Build Resource Right-Sizing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus / PromQL (metrics collection and querying)
- cAdvisor / kube-state-metrics (`container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`, `kube_pod_container_resource_requests`)
- Kubernetes (Deployments, annotations, events)
- Kubernetes Vertical Pod Autoscaler (VPA) — `autoscaling.k8s.io/v1`
- Python 3 (dataclasses, enum, statistics, requests)
- Kubernetes Python client (`AppsV1Api`, `CoreV1Api`, `V1Deployment`, `CoreV1Event`)
- k6 load testing (JavaScript-based scripts)
- Prometheus Operator (`monitoring.coreos.com/v1` PrometheusRule)
- Bash shell scripting

## Sources Consulted
- Prometheus documentation — PromQL functions `rate`, `avg_over_time`, `quantile_over_time`, and subquery syntax (https://prometheus.io/docs/prometheus/latest/querying/functions/)
- Prometheus Kubernetes SD configuration — relabel source labels like `__meta_kubernetes_pod_annotation_prometheus_io_scrape` (https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- cAdvisor / kubelet metric naming for `container_cpu_usage_seconds_total` and `container_memory_working_set_bytes`
- kube-state-metrics docs — `kube_pod_container_resource_requests` metric (https://github.com/kubernetes/kube-state-metrics/blob/main/docs/pod-metrics.md)
- Kubernetes VPA documentation — `updateMode` values (`Off`, `Initial`, `Recreate`, `Auto`) and resourcePolicy structure (https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler)
- Kubernetes Python client reference — `CoreV1Api.list_namespace`, `AppsV1Api.read_namespaced_deployment`, `CoreV1Event` model (https://github.com/kubernetes-client/python)
- k6 documentation — `options.stages`, `thresholds`, `http_req_duration`, `http_req_failed`, and check syntax (https://grafana.com/docs/k6/latest/)
- Prometheus Operator PrometheusRule CRD (https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.PrometheusRule)

## Issues Found

1. **`ContinuousRightSizingController._reconcile_all_namespaces` called `list_namespace()` on `AppsV1Api`** — `list_namespace()` belongs to `CoreV1Api`, not `AppsV1Api`, so the code would raise `AttributeError` at runtime.
   - **Fix applied:** Added `self.core_v1 = client.CoreV1Api()` to the controller's `__init__` and changed the call to `self.core_v1.list_namespace()`.

## Review Notes

- The VPA manifest uses `updateMode: "Off"` which is a valid mode (alongside `Initial`, `Recreate`, `Auto`); recommendation-only is the correct semantic for the use case described.
- The PromQL subquery syntax (e.g., `rate(...)[7d:1h]`) is valid; `quantile_over_time` is also correct usage.
- The cost assumptions (`$0.031/core-hour`, `$0.004/GB-hour`, 730 hours/month) are reasonable order-of-magnitude figures for AWS/GCP general-purpose pricing but are illustrative — readers should substitute current provider rates for their region and instance family.
- In `_create_canary`, the code passes `spec=original.spec.template.spec` by reference, so subsequent mutations to `canary.spec.template.spec.containers` also mutate the in-memory original. This does not affect cluster state (the original is never re-applied), so it does not need a fix, but a deep copy would be cleaner if reused in production.
- `CoreV1Event.first_timestamp` / `last_timestamp` are typed as `datetime` in the Python client model; the code passes ISO strings, which the underlying JSON serializer typically accepts but may fail strict type validation in some client versions. Acceptable for illustrative code.
- The Kubernetes Python client class name `CoreV1Event` is correct for the core `v1` Event API (as opposed to the newer `events/v1` `V1Event`); `CoreV1Api.create_namespaced_event` expects `CoreV1Event`.
- The k6 script uses the supported `export const options` / `export default function` ESM-style format and the threshold syntax (`'p(95)<500'`, `'rate<0.01'`) is current.
