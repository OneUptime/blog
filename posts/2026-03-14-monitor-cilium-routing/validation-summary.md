# Validation Summary: Monitoring Cilium Routing

## Status
validated

## Post Type
Tutorial / Guide

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
- Cilium Monitoring & Metrics reference: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm upgrade example used Cilium `1.16.5` and enabled Hubble metrics without enabling Hubble itself. Updated the example to Cilium `1.19.3` and added `hubble.enabled=true` plus `hubble.metrics.enableOpenMetrics=true`, matching current Cilium documentation.
- The Helm upgrade example did not create ServiceMonitors for Prometheus Operator based scraping. Added Cilium agent, operator, and Hubble ServiceMonitor settings.
- The Hubble metrics list used the deprecated `http` metric. Changed it to `httpV2`.
- The post used `cilium metrics list` inside the agent pod. Current Cilium command reference documents `cilium-dbg metrics list`, so the examples were updated.
- The agent health query referenced `cilium_agent_uptime_seconds`, which is not a documented current Cilium metric. Replaced it with the Prometheus scrape health query `up{job="cilium-agent"}`.
- The endpoint state queries grouped and filtered by `endpoint_state`, but current Cilium metrics documentation lists the label as `state`. Updated the dashboard query and alert expression.
- The dashboard referenced `cilium_datapath_conntrack_entries`, which is not a documented metric. Replaced it with `cilium_datapath_conntrack_gc_entries`.
- The Hubble examples assumed `hubble observe` should be run inside the Cilium DaemonSet. Updated them to use the documented local Hubble CLI with `-P` port forwarding and added the Hubble CLI to prerequisites.

## Review Notes
- The alert thresholds are example values and should be tuned per cluster traffic baseline.
- Prometheus `job` label values such as `cilium-agent` and `cilium-operator` can vary depending on ServiceMonitor or scrape configuration.
