# Validation Summary: How to Monitor Dapr Control Plane Resource Usage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (control plane components: operator, placement, sentry, sidecar-injector, scheduler)
- Kubernetes (kubectl, resource requests/limits, CFS CPU scheduling)
- Prometheus (PromQL queries, alerting rules)
- Helm (Dapr Helm chart for resource configuration)
- cAdvisor (container resource metrics)

## Sources Consulted
- Dapr overview documentation: https://docs.dapr.io/concepts/overview/
- Dapr Scheduler service documentation: https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Helm chart (Chart.yaml subchart definitions): https://github.com/dapr/dapr/blob/master/charts/dapr/Chart.yaml
- Kubernetes kubectl top reference (--sort-by flag)
- cAdvisor metric definitions (container_cpu_usage_seconds_total, container_memory_working_set_bytes, container_spec_memory_limit_bytes, container_spec_cpu_quota, container_spec_cpu_period)
- Prometheus alerting rules specification

## Issues Found
1. **CPU alert threshold was incorrect (line 125):** The PromQL expression `rate(container_cpu_usage_seconds_total[5m]) / container_spec_cpu_quota * 100000` correctly computes a ratio from 0 to 1 (where 1.0 = 100% CPU utilization of the limit). However, the threshold was `> 80`, which would mean >8000% utilization and would never fire. Changed to `> 0.80` to correctly alert at 80% CPU utilization, consistent with the memory alert which already uses `> 0.85` as a ratio.

## Review Notes
- The `dapr-operator` description "Manages Dapr CRDs and components" is slightly imprecise — the operator manages Dapr component Custom Resources (CRs) and Kubernetes service endpoints, not CRD schemas themselves. However, this is common informal usage and acceptable in a table summary.
- The memory percentage PromQL query could produce `+Inf` or `NaN` for containers with no memory limit set (`container_spec_memory_limit_bytes = 0`). A production deployment might want to add a filter like `container_spec_memory_limit_bytes > 0`. This is a best-practice enhancement, not an error.
- The `container!="POD"` filter is correct for excluding the pause container. Some queries also add `container!=""` to exclude pod-level aggregate entries, but this is a minor best-practice concern that doesn't affect correctness given the `sum by (pod)` aggregation.
- The CPU alert formula hardcodes the CFS period as 100000 microseconds (the Kubernetes default). While technically it would be more robust to use `container_spec_cpu_period`, the hardcoded value is correct for virtually all Kubernetes environments.
- The `dapr-scheduler` component was introduced in Dapr v1.14 (August 2024) — the post does not mention version requirements, which is fine for a general guide.
