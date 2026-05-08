# Validation Summary: How to Use Prometheus for Cilium Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Prometheus
- Prometheus Operator ServiceMonitor
- Grafana
- Kubernetes
- Helm

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium v1.15 metrics documentation source: https://raw.githubusercontent.com/cilium/cilium/v1.15.0/Documentation/observability/metrics.rst
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.15 Helm chart values: https://raw.githubusercontent.com/cilium/cilium/v1.15.0/install/kubernetes/cilium/values.yaml
- Cilium v1.15 ServiceMonitor templates: https://github.com/cilium/cilium/tree/v1.15.0/install/kubernetes/cilium/templates
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium v1.15 command reference files: https://github.com/cilium/cilium/tree/v1.15.0/Documentation/cmdref
- Grafana dashboard API pages for dashboard IDs 16611, 16612, and 16613: https://grafana.com/grafana/dashboards/16611, https://grafana.com/grafana/dashboards/16612, https://grafana.com/grafana/dashboards/16613

## Issues Found
- The Hubble Helm values used `httpV2:exemplars=true` without enabling OpenMetrics. Added `hubble.metrics.enableOpenMetrics: true` because Cilium documents OpenMetrics as required for exemplars.
- The DNS query PromQL grouped by `query`, but the Hubble DNS metric only includes the `query` label when the metric is enabled with the `dns:query` option. Updated the Helm value from `dns` to `dns:query`.
- The Hubble metrics list omitted `port-distribution` while the official example and Grafana Hubble dashboard use `hubble_port_distribution_total`. Added `port-distribution`.
- The ServiceMonitor example used `hubble-metrics` as the ServiceMonitor name. The Cilium chart names the ServiceMonitor `hubble`; `hubble-metrics` is the headless Service. Updated the sample output.
- The ServiceMonitor verification command piped to `grep cilium`, which would hide the `hubble` ServiceMonitor. Replaced it with Cilium's `app.kubernetes.io/part-of=cilium` label selector.
- The manual Prometheus scrape config targeted Hubble as a Cilium pod on port 9965. Cilium documents Hubble scraping through the annotated `hubble-metrics` service endpoints. Replaced the manual scrape example with Cilium's annotation-based pod and endpoint discovery patterns.
- The post referenced non-existent or incorrect metric names: `cilium_endpoint_count`, `cilium_policy_verdict_total`, and `cilium_operator_ipam_allocation_ops`. Replaced them with documented metrics: `cilium_endpoint_state`, `hubble_flows_processed_total` grouped by `verdict`, and `cilium_operator_ipam_ip_allocation_ops`.
- The verification query used `cilium_endpoint_count`. Updated it to query `cilium_endpoint_state`.
- The Hubble metrics verification command used `cilium metrics list`. Cilium v1.15 and current command references expose this as `cilium-dbg metrics list`. Updated the command.
- The troubleshooting guidance said missing Hubble metrics require Hubble Relay. Hubble metrics are served by Cilium agents through the Hubble metrics service, not by Hubble Relay. Updated the guidance to check `hubble.metrics.enabled` and the `hubble-metrics` service.
- The L7 troubleshooting note referenced visibility annotations. Current Cilium documentation describes enabling L7 visibility with L7 CiliumNetworkPolicy rules and L7 proxy support. Updated the note accordingly.

## Review Notes
Cilium 1.15.0 is an older release. The post is technically valid for the stated version after the fixes, but future maintenance should consider updating the commands to a currently supported Cilium release and reviewing the dashboard recommendations against the latest bundled dashboards.
