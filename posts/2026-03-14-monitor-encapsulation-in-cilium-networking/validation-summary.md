# Validation Summary: Monitoring Encapsulation in Cilium Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- VXLAN and Geneve encapsulation
- Prometheus and Prometheus Operator
- Grafana
- Hubble
- Helm

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli.html
- Cilium Hubble overview documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- Updated the Helm chart version from `1.16.5` to `1.19.3`, matching the current stable Cilium documentation consulted during review.
- Added `prometheus.serviceMonitor.enabled=true`, `operator.prometheus.serviceMonitor.enabled=true`, and `hubble.metrics.serviceMonitor.enabled=true` because the guide assumes kube-prometheus-stack / Prometheus Operator discovery.
- Added `hubble.enabled=true` because Cilium documentation requires Hubble to be enabled before using Hubble metrics.
- Replaced deprecated Hubble metric `http` with `httpV2`, because Cilium marks the legacy `http` metric as deprecated and mutually exclusive with `httpV2`.
- Replaced `cilium metrics list` with `cilium-dbg metrics list`, which is the documented in-pod command for listing Cilium agent metrics.
- Replaced the non-documented `cilium_agent_uptime_seconds` query with a Prometheus `up` query for agent target health.
- Corrected `cilium_endpoint_state` grouping and alert selectors from `endpoint_state` to the documented `state` label.
- Replaced the nonexistent `cilium_datapath_conntrack_entries` dashboard metric with `cilium_datapath_conntrack_gc_entries`, the documented conntrack garbage-collection entry metric.
- Changed the Hubble examples to resolve a concrete Cilium pod name before running `kubectl exec`, matching documented Hubble CLI usage inside Cilium agent pods.

## Review Notes
- The encapsulation explanation, default VXLAN/Geneve ports, and statement that Cilium defaults to encapsulation when no routing configuration is provided were verified against the Cilium routing documentation.
- Job labels such as `cilium-agent` and `cilium-operator` can vary by Prometheus scrape configuration, so dashboard users may still need to adjust those selectors for their local kube-prometheus-stack setup.
