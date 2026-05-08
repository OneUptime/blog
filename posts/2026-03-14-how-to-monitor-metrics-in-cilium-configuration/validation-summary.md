# Validation Summary: How to Monitor Metrics in Cilium configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator PrometheusRule
- Grafana
- Bash

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium command reference for `cilium-health status`: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Cilium command reference for `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The prerequisites pinned Kubernetes to `v1.21+`, which is not correct for all Cilium `v1.14+` releases. Updated the wording to require a Kubernetes version supported by the installed Cilium release.
- The Helm example enabled Hubble and OpenMetrics but did not set `hubble.metrics.enabled`, so Hubble metrics would remain disabled. Added an explicit Hubble metrics list.
- The key metrics examples used `cilium metrics list`, which is not a command in the Kubernetes-facing Cilium CLI. Replaced these with `kubectl exec ... cilium-dbg metrics list --match-pattern ...` commands run inside a Cilium agent pod.
- The Grafana dashboard example used `hubble.ui.enabled=true`, which enables the Hubble UI rather than Grafana dashboard ConfigMaps. Replaced it with the documented dashboard Helm values for Cilium agent, operator, and Hubble metrics dashboards.
- The alert rule used a non-existent policy regeneration metric. Replaced it with the documented endpoint regeneration metric and updated the alert name and summary.
- Several troubleshooting and verification commands used agent-local commands as if they were top-level `cilium` CLI commands. Replaced them with `kubectl exec ... cilium-dbg` or `cilium-health` where appropriate.
- The resource metric example searched via the invalid metrics-list path. Updated it to query the Prometheus endpoint for standard process and Go runtime metrics.

## Review Notes
The PrometheusRule example assumes the Prometheus Operator CRDs are installed. The post already lists Prometheus and Grafana as recommended prerequisites, but future revisions could call out the Prometheus Operator requirement explicitly when using `monitoring.coreos.com/v1` resources.
