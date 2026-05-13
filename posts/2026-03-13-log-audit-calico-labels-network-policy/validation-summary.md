# Validation Summary: How to Log and Audit Calico Label-Based Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes API audit logging
- Kubernetes labels
- kubectl
- jq
- kube-state-metrics
- PrometheusRule and PromQL
- journald / node kernel logs

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Felix configuration reference - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit API reference - https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus documentation: Querying basics - https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus Operator / OpenShift API reference: PrometheusRule monitoring.coreos.com/v1 - https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/monitoring_apis/prometheusrule-monitoring-coreos-com-v1

## Issues Found
- The introduction said Calico's `Log` action captures policy-level traffic decisions. Calico `Log` records traffic matching the rule and then rule processing continues; the later `Allow` or `Deny` rule makes the final decision. Updated the wording to reflect that behavior.
- The troubleshooting command searched for `CALICO.*DENY`, but Calico policy log output commonly uses the default Felix log prefix `calico-packet` and does not necessarily include a `DENY` marker. Updated the command to search kernel journal entries for `calico-packet`.
- The Prometheus alert used `kube_pod_labels{label_tier=""}` without noting that kube-state-metrics only exposes Kubernetes labels as Prometheus labels when configured via `--metric-labels-allowlist`. Added that requirement to the snippet.
- The architecture diagram labeled Calico `Log` action output as `Felix Flow Logs`. For Calico open source policy log actions, the documented output is node policy packet logs, typically in journald/syslog/kernel logs depending on the dataplane and host logging setup. Updated the label.

## Review Notes
The audit policy, Calico NetworkPolicy structure, jq examples, and PrometheusRule shape are technically valid. Calico log locations vary by dataplane and node logging configuration, so production documentation should still confirm where each cluster sends kernel/syslog policy log entries.
