# Validation Summary: Monitoring Disadvantages of Native Routing in Cilium

## Status
validated

## Post Type
Guide

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
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The Hubble metrics Helm example enabled `hubble.metrics.enabled` without enabling Hubble itself. Added `hubble.enabled=true` because Cilium documents that Hubble metrics require Hubble to be enabled.
- The Hubble metrics list used `http`; current Cilium docs mark the legacy HTTP metric as deprecated in favor of `httpV2`. Updated the value to `httpV2`.
- The Helm command pinned Cilium 1.16.5 while using `--reuse-values`. Replaced the outdated fixed version with a placeholder for the currently deployed chart version because Cilium's upgrade guide cautions that `--reuse-values` is only safe for same-version configuration changes.
- The metrics inspection command used `cilium metrics list`, but the in-agent command documented by Cilium is `cilium-dbg metrics list`. Updated both command examples and added the `cilium-agent` container selector.
- The endpoint state PromQL used the label `endpoint_state`, but Cilium exports `cilium_endpoint_state` with the `state` label. Updated the dashboard and alert examples.
- The agent health panel referenced `cilium_agent_uptime_seconds`, which is not listed in the current Cilium metrics documentation. Replaced it with the standard scrape health metric `up{job="cilium-agent"}`.
- The dashboard referenced `cilium_datapath_conntrack_entries`, which is not a documented current Cilium metric. Replaced it with `cilium_datapath_conntrack_gc_entries`.

## Review Notes
The post is technically relevant and the native-routing explanation aligns with Cilium's routing documentation. For production use, readers should still follow Cilium's upgrade guide and use a supported version and upgrade path for their cluster.
