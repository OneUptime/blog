# Validation Summary: How to Monitor Resource Usage for Cost Allocation on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Prometheus (kube-prometheus-stack, PrometheusRule CRD)
- kube-state-metrics
- cAdvisor metrics
- PromQL (recording rules, alerting rules)
- Kyverno (ClusterPolicy)
- Grafana (dashboard JSON)
- Helm
- Bash / curl / jq

## Sources Consulted
- Kyverno validate policy docs: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus template reference (humanizePercentage): https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- prometheus-operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- prometheus-operator storage docs: https://prometheus-operator.dev/docs/platform/storage/
- kube-prometheus-stack helm chart values

## Issues Found
- **`HighResourceWaste` alert annotation displayed the efficiency ratio incorrectly as a percentage.** The expression `team:cpu_efficiency:ratio` produces a unitless ratio (e.g., `0.15` for 15% efficiency), but the original annotation used `{{ $value | printf "%.1f" }}%`, which would render the value `0.15` as `"0.2%"` rather than `"15.0%"`. Replaced with `{{ $value | humanizePercentage }}`, the Prometheus template function specifically designed for ratio-to-percentage formatting (multiplies by 100 and appends `%`).

## Review Notes
- **Kyverno `spec.validationFailureAction` is deprecated as of Kyverno 1.13** (October 2024) in favor of the rule-level `spec.rules[*].validate.failureAction`. The spec-level form in the post still works in current Kyverno releases but will eventually be removed. New policies should prefer the rule-level form.
- **kube-prometheus-stack storage caveat:** Setting `prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage` works for new installs, but increasing the value on an existing install does not auto-expand the underlying PVCs — manual PVC resize is required. Not a correctness issue but worth knowing for operators following this guide.
- The "shared cost allocation" rule using `ignoring(label_team) group_left()` is valid PromQL but unusual; `on() group_left()` is the more conventional pattern for dividing each series by a cluster-wide total. Functionally equivalent here because the aggregated recording rule on the left only carries `label_team`.
- The `interval: 1h` group interval for the dollar-cost rules combined with `avg_over_time(...[30d]) * 730` in the reporting script is a reasonable approximation of monthly cost; users should remember that 730 hours assumes an average month (365.25 × 24 / 12).
- The cost-rate constants (`$0.04/core-hour`, `$0.005/GB-hour`) are explicitly called out as placeholders to be replaced with the reader's own cloud pricing — appropriate caveat.
