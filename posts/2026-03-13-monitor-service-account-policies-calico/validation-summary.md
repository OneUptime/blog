# Validation Summary: How to Monitor Calico Service Account-Based Policy Impact

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico, open source)
- Kubernetes Service Accounts
- Calico service-account-based NetworkPolicy / GlobalNetworkPolicy matching
- Felix (Calico's per-node policy enforcement daemon)
- kube-state-metrics
- Prometheus (Felix metrics endpoint)
- Prometheus Operator (`PrometheusRule` CRD, `monitoring.coreos.com/v1`)
- Grafana
- `kubectl` and `jsonpath` for ad-hoc audit scripting

## Sources Consulted
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Cloud policy metrics reference (`calico_denied_packets`, `cnx_policy_rule_packets`): https://docs.tigera.io/calico-cloud/operations/monitor/metrics/policy-metrics
- Prometheus Operator `PrometheusRule` CRD reference
- Kubernetes ServiceAccount API reference

## Issues Found

1. **Wrong kube-state-metrics metric name.** The post referenced `kube_pod_spec_service_account_name`, which does not exist. The correct metric is `kube_pod_service_account` (with labels `pod`, `namespace`, `uid`, and `service_account`). Replaced every occurrence (Step 1, Step 2 alert, Step 3 dashboard panels) and added a short note that this metric is marked EXPERIMENTAL in kube-state-metrics so its shape may change between releases.

2. **`felix_denied_packets_total` does not exist in open source Calico.** The `UnexpectedSADenials` alert in Step 2 referenced this metric, so it would have never produced any series and would never have fired. Removed the alert and replaced it with `FelixIptablesSaveErrors` (`rate(felix_iptables_save_errors[5m]) > 0`), which is a real Felix metric and is a meaningful proxy for "is policy enforcement actually being programmed on this node?" Also added a paragraph noting that the equivalent for Cloud/Enterprise is `calico_denied_packets` (labeled by `policy` and `srcIP`).

3. **`felix_policy_evaluation_total` does not exist.** Open source Felix exposes no counter by this name. Replaced the Step 3 dashboard panel with `felix_cluster_num_policies`, a real gauge that gives a useful "enforcement scope" signal on the same dashboard.

## Review Notes
- The Step 4 bash audit script is functional but has a few rough edges that are stylistic rather than incorrect, so they were left alone per the review guidelines: it uses `grep " default$"` against a `custom-columns` output (works but brittle if column widths change), and the `for sa in $(... <newline embedded jsonpath> ...)` loop relies on word-splitting on whitespace which is acceptable for the namespace/name format used.
- The `mermaid` diagram describes "SA-annotated flow logs" from Calico Felix. Flow logs with service account identity are a Calico Cloud / Enterprise feature (open source flow logs are simpler). The diagram is not wrong, but a future revision could call out this Cloud/Enterprise dependency explicitly.
- The post claims `Calico v3.26+` as the prerequisite. Service-account-selector support in Calico NetworkPolicy long predates v3.26, so the constraint is technically conservative-but-correct rather than wrong; left as-is.
- The `kube_pod_service_account` metric is marked EXPERIMENTAL in kube-state-metrics — readers on older or non-default kube-state-metrics builds may need to enable the `serviceaccounts` resource explicitly or fall back to scraping the `service_account` label off `kube_pod_info` if their version exposes it. Out of scope to expand here.
- The Conclusion still references "Calico denial rate metrics" in general terms; this is fine because the fixes already clarify in Step 2 that those denial metrics are Cloud/Enterprise-only in practice.
