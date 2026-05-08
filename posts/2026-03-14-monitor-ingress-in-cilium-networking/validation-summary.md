# Validation Summary: Monitoring Ingress in Cilium Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium Ingress and Gateway API
- Cilium Prometheus metrics
- Hubble flow observability
- Kubernetes
- Helm
- Prometheus and PrometheusRule
- Grafana

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Kubernetes Ingress Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/ingress/
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium troubleshooting documentation for Hubble commands: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm example pinned Cilium to `1.16.5`, which is outdated relative to the current stable Cilium documentation consulted. Updated it to `1.19.3`.
- The Hubble metrics Helm values enabled Hubble metrics without explicitly enabling Hubble. Added `hubble.enabled=true`, which the Cilium docs require for Hubble metrics.
- The post used `cilium metrics list` inside the Cilium pod. Current Cilium command reference documents `cilium-dbg metrics list` for agent metrics, so the command was updated.
- The `cilium_proxy_upstream_reply_seconds` PromQL query treated a histogram base metric as directly rateable. Updated the panel query to use `cilium_proxy_upstream_reply_seconds_count`.
- The post referenced `cilium_agent_uptime_seconds`, which is not listed in the current Cilium exported metrics. Replaced it with an `up`-based Cilium scrape health query.
- The endpoint state query and alert used `endpoint_state` as a label. Current Cilium docs list the label as `state`, so the queries were corrected.
- The high drop alert used a non-aggregated vector expression but described a scalar threshold. Updated it to `sum(rate(cilium_drop_count_total[5m])) > 50` and removed the unavailable `instance` label reference from the annotation summary.
- The dashboard section referenced `cilium_datapath_conntrack_entries`, which is not listed in the current Cilium metrics. Replaced it with `cilium_datapath_conntrack_gc_entries`.
- The Hubble examples executed `hubble observe` inside the Cilium DaemonSet. Updated them to use the documented local Hubble CLI with `-P` port-forwarding and added the Hubble CLI to prerequisites.

## Review Notes
The dashboard job-label examples may still need minor adjustment in clusters where Prometheus discovers Cilium targets under custom job names, but the PromQL structure and metric names now match the official Cilium documentation.
