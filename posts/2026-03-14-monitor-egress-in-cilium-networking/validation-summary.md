# Validation Summary: Monitoring Egress in Cilium Networking

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
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium troubleshooting documentation for Hubble flow observation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Prometheus Operator PrometheusRule API reference: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- Prometheus Operator alerting and rule selection documentation: https://prometheus-operator.dev/docs/developer/alerting/

## Issues Found
- The Helm example enabled Hubble metrics but did not enable Hubble itself. Added `hubble.enabled=true`, matching Cilium's documented Hubble metrics setup.
- The Helm example targeted kube-prometheus-stack but did not enable Cilium ServiceMonitor resources. Added `prometheus.serviceMonitor.enabled=true`, `operator.prometheus.serviceMonitor.enabled=true`, and `hubble.metrics.serviceMonitor.enabled=true` so Prometheus Operator can discover the targets.
- The Helm example used Cilium `1.16.5` and the deprecated Hubble `http` metric. Updated the example to Cilium `1.19.3` and `httpV2`.
- The post used `cilium metrics list`, but current Cilium agent pods expose the metrics command as `cilium-dbg metrics list`. Updated both examples.
- The PromQL used `cilium_agent_uptime_seconds`, which is not documented as a current Cilium metric. Replaced it with the Prometheus scrape-health metric `up`.
- The endpoint-state PromQL used the label `endpoint_state`, but Cilium documents the `cilium_endpoint_state` label as `state`. Updated dashboard and alert queries.
- The high-drop-rate examples counted all traffic directions even though the post is about egress monitoring. Added `direction="egress"` filters to the egress drop and forward queries.
- The dashboard referenced `cilium_datapath_conntrack_entries`, which is not a documented current metric. Replaced it with `cilium_datapath_conntrack_gc_entries`.
- The Hubble examples executed `hubble observe` inside an arbitrary Cilium DaemonSet pod, which provides node-local visibility unless carefully targeted. Updated the examples to use the local Hubble CLI against the Hubble Relay API.
- The prerequisites did not include Hubble CLI or an enabled Hubble deployment, even though the guide uses Hubble flow observation. Added that prerequisite.

## Review Notes
- `cilium_policy_l7_total` and Hubble HTTP metrics are only useful for traffic where L7 visibility is enabled. Future revisions could call this out more explicitly.
- The exact `job` label values for `up{job=~"cilium|cilium-agent"}` depend on the Prometheus Operator and ServiceMonitor configuration, so operators may need to adjust them for their stack.
