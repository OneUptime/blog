# Validation Summary: Monitoring Advantages of the Encapsulation Model in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Prometheus
- Prometheus Operator
- Grafana
- Hubble
- Helm

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Hubble documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium IPsec Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction overstated encapsulation as preventing all pod IP conflicts and described encryption as tunnel-level. Updated the wording to match Cilium's documented encapsulation requirements and transparent encryption behavior.
- The Helm example enabled Hubble metrics without explicitly enabling Hubble and used the deprecated `http` Hubble metric. Added `hubble.enabled=true` and changed the Hubble metric to `httpV2`.
- The Cilium version in the Helm example was outdated for current documentation. Updated the example to Cilium `1.19.3`.
- The metric inspection commands used `cilium metrics list`, but the documented in-agent command is `cilium-dbg metrics list`. Updated both occurrences.
- The endpoint state PromQL used the wrong label name, `endpoint_state`. Cilium documents the label as `state`; updated the dashboard and alert examples.
- The agent health panel used `cilium_agent_uptime_seconds`, which is not listed in current Cilium exported metrics. Replaced it with the Prometheus scrape health metric `up{job="cilium-agent"}`.
- The conntrack dashboard panel referenced `cilium_datapath_conntrack_entries`, which is not listed in current Cilium exported metrics. Replaced it with `cilium_datapath_conntrack_gc_entries`.

## Review Notes
The Prometheus `job` label values in the dashboard examples may vary depending on ServiceMonitor and Prometheus relabeling configuration. The post already notes that ServiceMonitor labels and Prometheus Operator selectors should be checked when troubleshooting.
