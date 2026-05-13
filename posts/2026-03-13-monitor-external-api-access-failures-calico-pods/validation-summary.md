# Validation Summary: How to Monitor External API Access Failures from Calico Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Prometheus Operator
- PrometheusRule
- Blackbox Exporter
- Prometheus metrics and PromQL alerts
- kubectl
- Linux conntrack

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus Operator API reference for Probe and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus multi-target exporter guide for Blackbox Exporter metrics: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus Blackbox Exporter project documentation: https://github.com/prometheus/blackbox_exporter
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico conntrack documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/conntrack

## Issues Found
- The Prometheus Operator `Probe` example did not set `spec.jobName`, but the alert expressions filtered on `job="external-api-probe"`. Added `jobName: external-api-probe` so the generated probe metrics match the later alert rules.
- The post described `felix_active_local_policies` and an invalid-looking `felix_ipsets` pattern as egress policy metrics. Updated the text to refer to Calico policy and dataplane metrics, and replaced `felix_ipsets` with documented Felix metrics: `felix_iptables_rules` and `felix_bpf_num_ip_sets`.
- The conntrack example claimed `UNREPLIED` entries track denied egress connections. Updated the comment to clarify that one-way conntrack entries can indicate connectivity or NAT issues but are not Calico policy-deny counters.
- Verified the example external URLs, `https://api.github.com/zen` and `https://httpbin.org/get`, currently return HTTP 200.

## Review Notes
The Blackbox Exporter and Probe CRD examples are syntactically consistent with the Prometheus Operator API. The Felix metrics endpoint assumes Felix Prometheus metrics are enabled and reachable on port 9091, which is deployment-dependent.
