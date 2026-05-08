# Validation Summary: Monitoring Cilium Networking Concepts

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
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium `cilium config` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator alerting documentation: https://prometheus-operator.dev/docs/developer/alerting/

## Issues Found
- The Helm example pinned Cilium `1.16.5` and enabled deprecated Hubble `http` metrics. Updated the example to Cilium `1.19.3`, enabled Hubble explicitly, enabled OpenMetrics, and replaced `http` with `httpV2`.
- The Helm example enabled metrics endpoints but did not create Prometheus Operator `ServiceMonitor` resources, which is needed for the kube-prometheus-stack setup described in the prerequisites. Added Cilium, operator, and Hubble ServiceMonitor Helm values.
- The post used `cilium metrics list` inside the Cilium DaemonSet. The current in-agent command documented by Cilium is `cilium-dbg metrics list`, so both examples were updated.
- The PromQL example used `cilium_agent_uptime_seconds`, which is not a current Cilium exported metric. Replaced it with `up{job="cilium-agent"}` for agent scrape health.
- The endpoint state examples grouped and filtered `cilium_endpoint_state` with `endpoint_state`, but the documented metric label is `state`. Updated the dashboard query and alert expression.
- The dashboard referenced `cilium_datapath_conntrack_entries`, which is not a current documented Cilium metric. Replaced it with `cilium_datapath_conntrack_gc_entries`.

## Review Notes
The Prometheus job labels in the sample dashboard may vary by Prometheus Operator and ServiceMonitor configuration. The post already notes that ServiceMonitor labels must match the Prometheus operator configuration.
