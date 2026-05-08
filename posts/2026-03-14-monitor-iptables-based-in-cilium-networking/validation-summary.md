# Validation Summary: Monitoring iptables-Based Masquerading in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- iptables-based masquerading
- Prometheus
- Prometheus Operator PrometheusRule and ServiceMonitor resources
- Grafana
- Hubble
- Helm

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Masquerading documentation: https://docs.cilium.io/en/stable/network/concepts/masquerading/
- Cilium Troubleshooting and Hubble flow observation documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Command Reference for in-pod debug commands: https://docs.cilium.io/en/stable/cmdref/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/

## Issues Found
- The introduction said iptables mode works by installing MASQUERADE rules in POSTROUTING for traffic leaving the pod CIDR. Cilium's documentation describes the default iptables-based behavior as masquerading traffic leaving on a non-Cilium network device, so the explanation was corrected.
- The Helm example used Cilium 1.16.5, which is older than the current stable documentation reviewed. It was updated to 1.19.3.
- The Helm example enabled Hubble metrics without enabling Hubble. Cilium documents that Hubble metrics require `hubble.enabled=true`, so that value was added.
- The Helm example assumed a Prometheus Operator stack but did not enable ServiceMonitor resources. ServiceMonitor values were added for Cilium agent, Cilium operator, and Hubble metrics.
- The Hubble metric list used deprecated `http`. Cilium documentation recommends `httpV2`, so the value was updated.
- The post referenced `cilium_datapath_conntrack_entries`, which is not the documented exported metric. It was replaced with `cilium_datapath_conntrack_gc_entries`.
- The post used `rate()` on conntrack entries even though the documented metric is a gauge-like count after garbage collection, so the PromQL panel was changed to query the metric directly.
- The in-pod metric inspection command used `cilium metrics list`. Cilium's current in-pod debug command is `cilium-dbg metrics list`, so the commands were updated.
- The endpoint-state PromQL used the label `endpoint_state`. The documented label is `state`, so the dashboard and alert queries were corrected.
- The post referenced `cilium_agent_uptime_seconds`, which is not listed in the Cilium exported metrics reviewed. It was replaced with the standard Prometheus scrape health metric `up{job="cilium-agent"}`.

## Review Notes
The post is technically relevant and usable after correction. Some dashboard queries are general Cilium health indicators rather than metrics that prove iptables masquerading itself is functioning, but they are valid operational signals for a Cilium monitoring guide.
