# Validation Summary: How to Monitor Dapr Resource Usage for Cost Optimization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, annotations, metrics)
- Prometheus (ServiceMonitor, PromQL queries, alerting rules)
- Grafana (dashboard JSON model)
- Kubernetes (cAdvisor metrics, kubectl, container resource specs)
- Kubecost (cost allocation API)
- Helm

## Sources Consulted
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Prometheus Integration: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr Arguments and Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Sidecar Overview: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Prometheus container CPU usage calculation guides (SigNoz, Last9, AWS Containers Blog)
- Kubecost Allocation API documentation

## Issues Found

1. **Incorrect Dapr state store metric names (Step 2)**: The post used `dapr_component_state_get_total` and `dapr_component_state_set_total`, which are not real Dapr metrics. The correct metric is `dapr_component_state_count` with operation labels. Fixed the query to use the single correct metric name.

2. **Incorrect CPU utilization formula (Step 3)**: The Grafana dashboard CPU panel divided by `container_spec_cpu_quota` alone. Since `container_spec_cpu_quota` is in microseconds per period, you must divide it by `container_spec_cpu_period` to get the CPU limit in cores. Fixed to `(container_spec_cpu_quota / container_spec_cpu_period)`. Notably, Step 5 already had the correct formula — this was an inconsistency within the post.

3. **Incorrect Kubecost API filter syntax (Step 4)**: The filter parameter `filter=container:daprd` does not match Kubecost's documented Allocation API. Changed to `filterContainers=daprd`, which is the correct query parameter format.

4. **Cost alert overestimates by 3600x (Step 6)**: The alert expression multiplied by `3600 * 24 * 30` (seconds per month) then by `$0.05` (a per-core-hour cost). Since `rate()` returns cores (CPU-seconds per second), you only need to multiply by `24 * 30` (hours per month) when using a per-core-hour cost. The erroneous `* 3600` factor inflated the estimated cost by 3600x. Removed the `3600 *` multiplier.

## Review Notes
- The post's Step 5 CPU utilization query correctly uses `container_spec_cpu_quota / container_spec_cpu_period`, making the Step 3 error likely a copy/editing oversight rather than a conceptual misunderstanding.
- The cost alert in Step 6 uses a flat $0.05/core-hour assumption. Real cloud pricing varies by instance type, region, and commitment level. This is acceptable for a blog post example but readers should substitute their actual cost-per-core-hour.
- The Kubecost helm install uses `kubecostToken="my-token"` which is fine as a placeholder, but readers should note Kubecost requires a real token for full functionality.
