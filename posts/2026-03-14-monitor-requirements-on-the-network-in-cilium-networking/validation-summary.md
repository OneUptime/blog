# Validation Summary: Monitoring Network Requirements for Cilium

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
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Monitoring & Metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Routing Concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli.html
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The introduction stated that all modes require TCP port 4244 for Hubble. Cilium documents TCP 4240 for `cilium-health`; TCP 4244 is for the Hubble server when Hubble is enabled. Updated the wording to make Hubble conditional.
- The Helm command enabled `hubble.metrics.enabled` without enabling Hubble itself. Cilium requires `hubble.enabled=true` for Hubble metrics, so this value was added.
- The Helm command used Cilium `1.16.5` and the older Hubble `http` metric. Updated the example to current stable Cilium `1.19.3`, enabled OpenMetrics, and used `httpV2`.
- The post referenced `cilium_agent_uptime_seconds`, which is not listed in the current Cilium metrics reference. Replaced it with documented cluster health metrics: `cilium_unreachable_nodes` and `cilium_unreachable_health_endpoints`.
- The post used `cilium metrics list` inside the Cilium pod. Current command reference documents `cilium-dbg metrics list`, so the examples were updated.
- The endpoint-state queries used the label `endpoint_state`; the documented label for `cilium_endpoint_state` is `state`. Updated dashboard and alert queries accordingly.
- The endpoint alert checked `endpoint_state="not-ready"`, which is not a documented endpoint state label/value combination. Updated it to alert on non-ready endpoint states with `state!="ready"`.
- The dashboard referenced `cilium_datapath_conntrack_entries`, which is not documented. Replaced it with the documented `cilium_datapath_conntrack_gc_entries` metric.

## Review Notes
- The Prometheus `up{job="cilium-agent"}` and `up{job="cilium-operator"}` examples depend on Prometheus scrape job naming, which can vary by ServiceMonitor or scrape configuration. They are plausible dashboard examples but may need label adjustment in individual clusters.
- Hubble L7 metrics such as HTTP require Layer 7 visibility to be configured for the relevant traffic; otherwise the metrics may exist but show no application-layer data.
