# Validation Summary: How to Set Up Four Golden Signals Monitoring with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio telemetry metrics
- Prometheus and PromQL
- Grafana dashboards
- Kubernetes container and kube-state-metrics metrics
- Envoy proxy statistics
- Google SRE Four Golden Signals and error-budget burn alerts

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy Statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/reference/dashboard/
- Grafana Prometheus template variables: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/prometheus/template-variables/
- Google SRE Book, Monitoring Distributed Systems: https://sre.google/sre-book/monitoring-distributed-systems/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The traffic breakdown example claimed to show HTTP method, but the query grouped by Istio's `request_protocol` label. Updated the text and comment to describe protocol, which matches Istio's documented label.
- The CPU limit examples used `kube_pod_container_resource_limits` without the documented `unit` label. Added `unit="core"` to CPU examples.
- The memory saturation query divided unaggregated cAdvisor memory series by kube-state-metrics limit series, which can fail due to mismatched labels. Aggregated both sides by `pod` and `namespace` and added `unit="byte"` to the memory limit selector.
- The connection pool saturation example divided `envoy_cluster_upstream_rq_pending_active` by `envoy_cluster_upstream_rq_pending_total`. Envoy documents the former as a gauge and the latter as a cumulative counter, so that ratio is not meaningful. Replaced it with a pending overflow rate and kept queue depth as a saturation indicator.
- The post implied Envoy saturation metrics would be available without additional configuration. Added a note that Istio only records a minimal Envoy stats set by default and that Envoy-specific saturation examples require enabling the relevant stats with `ProxyConfig.proxyStatsMatcher`.
- The Grafana proxy CPU panel was labeled as a percentage but returned a 0-1 ratio. Multiplied the query by 100.
- The Error Budget Burn rule was described as multi-window but only checked the 1-hour burn rate. Updated the PromQL expression to require both the 1-hour and 5-minute burn-rate windows, matching the SRE Workbook pattern for a 14.4x alert.

## Review Notes
- The Istio service metric names and core labels used by the post are current in Istio 1.30 documentation.
- Envoy statistics exposed through Istio can vary by proxy stats matcher configuration, so the Envoy-specific saturation queries should be validated in the target mesh before relying on them for production alerts.
