# Validation Summary: Monitoring Request/Response Rate (TCP_RR) in Cilium Performance

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes CronJob
- Prometheus and Prometheus Operator
- Grafana dashboards
- Prometheus Pushgateway
- netperf TCP_RR

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `connectivity perf` command reference and performance image defaults: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_perf.html
- Cilium End-To-End Connectivity Testing documentation: https://docs.cilium.io/en/stable/contributing/testing/e2e.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator ServiceMonitor and PrometheusRule API documentation: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Pushgateway documentation: https://prometheus.io/docs/instrumenting/pushing/
- Grafana dashboard JSON model and visualization documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/ and https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- netperf manual page: https://man.archlinux.org/man/extra/netperf/netperf.1.en

## Issues Found
- Hubble was described as exposing generic per-flow TCP_RR latency. Hubble metrics expose flow, TCP flag, drop, and protocol-level metrics, but TCP_RR latency must come from a synthetic benchmark such as netperf. Updated the introduction to separate Hubble flow/drop signals from synthetic TCP_RR latency.
- The Helm command enabled `httpV2:exemplars=true` without enabling OpenMetrics. Added `hubble.metrics.enableOpenMetrics=true`, which Cilium documents as required for exemplar support.
- The Hubble metrics configuration only added workload labels to `httpV2`, while the dashboard queried `source_workload` and `destination_workload` on flow and TCP metrics. Added `labelsContext` to the `drop`, `tcp`, and `flow` Hubble metrics.
- The manual ServiceMonitor example could fail because ServiceMonitor selectors must match Services and endpoint ports by name, and Cilium already exposes Helm values to create the correct ServiceMonitors. Replaced it with the chart-supported ServiceMonitor flags and selector-label guidance.
- The command `cilium metrics list` is not the documented command for agent metric status. Replaced it with `kubectl -n kube-system exec ds/cilium -- cilium-dbg metrics list --match-pattern ...`.
- The TCP flow dashboard query used a non-documented `protocol` label on `hubble_flows_processed_total`. Replaced it with a flow event rate query grouped by the workload labels configured in Hubble.
- The TCP retransmission panel attempted to infer retransmits from `SYN` minus `SYN-ACK`, but Hubble's `tcp_flags_total` metric publishes TCP flag occurrences, not combined `SYN-ACK` transaction state. Replaced the panel with a TCP SYN rate panel.
- Grafana panel type `graph` is legacy compared with the current `timeseries` visualization. Updated dashboard panels to use `timeseries`.
- The synthetic monitoring example used the old `cilium/netperf` image and did not enable netperf's additional latency statistics. Updated it to Cilium's documented `quay.io/cilium/network-perf` image family and added `-j` plus explicit `THROUGHPUT,MEAN_LATENCY,P99_LATENCY` output selectors.
- The troubleshooting section did not mention that the CronJob requires a reachable `netperf-server`/`netserver` endpoint. Added a check for the `netperf-server` Service and backing pod.

## Review Notes
The Grafana JSON remains a compact illustrative dashboard rather than a complete export with all dashboard metadata. The Pushgateway pattern is valid for short-lived batch jobs, but Prometheus documents operational caveats around stale series and single points of failure.
