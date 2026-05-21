# Validation Summary: How to Monitor Istio Resource Usage for Cost Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus and PromQL
- kube-state-metrics
- cAdvisor container metrics
- Grafana
- Prometheus alerting and recording rules
- Bash, curl, jq, and bc

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio exported control-plane metrics reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus operators reference: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/README.md

## Issues Found
- Fixed invalid PromQL aggregation syntax in the sidecar CPU and memory utilization ratio queries by changing `avg(...) by (namespace)` to the valid `avg by (namespace) (...)` form.
- Changed sidecar request-vs-usage calculations to aggregate both operands by `namespace` and `pod` before division or subtraction. This avoids fragile vector matching against differing cAdvisor and kube-state-metrics label sets.
- Wrapped wasted CPU and memory calculations in `clamp_min(..., 0)` so workloads using more than their request do not create negative "waste" values.
- Updated the xDS p99 latency query to aggregate histogram buckets with `sum by (le) (...)` before `histogram_quantile`, which matches Prometheus guidance for calculating an overall quantile from classic histogram buckets.
- Updated the sidecar and istiod memory-limit alerts to aggregate usage and limits by `namespace` and `pod` before division. The original istiod alert would not reliably match series because kube-state-metrics limit series include labels such as `resource` and `unit` that cAdvisor memory usage series do not.

## Review Notes
- `promtool` was not installed in the local environment, so the rule files were reviewed against Prometheus documentation rather than checked with `promtool check rules`.
- The cost constants are examples and remain environment-specific; teams should replace them with their actual node, cluster, or cloud-provider pricing.
