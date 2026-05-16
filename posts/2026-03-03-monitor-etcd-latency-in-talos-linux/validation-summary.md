# Validation Summary: How to Monitor etcd Latency in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (etcd metrics endpoint exposure on port 2381)
- etcd (v3) and its Prometheus metrics
- Prometheus + prometheus-operator (ServiceMonitor, PrometheusRule)
- Kubernetes Service / Endpoints (headless service for etcd metrics)
- Grafana dashboards (dashboard ID 3070)
- talosctl CLI

## Sources Consulted
- etcd metrics documentation: https://etcd.io/docs/v3.5/metrics/
- etcd metrics raw dump: https://etcd.io/docs/v3.5/metrics/etcd-metrics-latest.txt
- etcd monitoring guide: https://etcd.io/docs/v3.5/op-guide/monitoring/
- Official etcd mixin alerts: https://github.com/etcd-io/etcd/blob/main/contrib/mixin/alerts/alerts.libsonnet
- Official etcd mixin dashboard targets: https://github.com/etcd-io/etcd/blob/main/contrib/mixin/dashboards/targets.libsonnet
- Kubernetes apiserver etcd metric source: https://github.com/kubernetes/apiserver/blob/master/pkg/storage/etcd3/metrics/metrics.go
- Talos Linux etcd metrics guide: https://www.talos.dev/v1.11/kubernetes-guides/configuration/etcd-metrics/
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Grafana dashboard 3070 (etcd by Prometheus): https://grafana.com/grafana/dashboards/3070-etcd/

## Issues Found

1. **Incorrect metric used for client request latency** — The original PromQL queries used `etcd_request_duration_seconds_bucket{type="Range"}` (and similarly for `Put`). This metric is **not exposed by etcd itself**; it is exposed by the Kubernetes API server, and even there its labels are `operation`, `group`, `resource` — not `type`. Since the post explicitly tells the reader to scrape the etcd metrics endpoint on port 2381, those queries would return no data. Fixed by switching to the metric the official etcd mixin uses: `grpc_server_handling_seconds_bucket{grpc_method="Range", grpc_type="unary"}` (and `grpc_method="Put"` for writes), and `grpc_server_handled_total` for request rate.

2. **Same incorrect metric in the alert rule** — `EtcdHighRequestLatency` used `etcd_request_duration_seconds_bucket` with no labels and a 50ms threshold. Fixed to use `grpc_server_handling_seconds_bucket{grpc_type="unary", grpc_method!="Defragment"}` (matching the official etcd mixin's `etcdGRPCRequestsSlow` alert) and updated the threshold to 150ms, matching the upstream recommendation. The summary annotation was updated accordingly.

## Review Notes

- The etcd metric names `etcd_disk_wal_fsync_duration_seconds`, `etcd_disk_backend_commit_duration_seconds`, `etcd_network_peer_round_trip_time_seconds`, `etcd_server_proposals_committed_total`, `etcd_server_proposals_applied_total`, `etcd_server_proposals_failed_total`, and `etcd_server_proposals_pending` are all confirmed present in the etcd v3.5 metrics dump.
- Talos exposing etcd metrics on port 2381 (via `listen-metrics-urls`) is correct, but the post does not explicitly mention that the user must first enable this via a machine config patch (etcd does not bind to `0.0.0.0:2381` by default in Talos). The post jumps directly to scraping; this is a useful caveat but not a technical error in what is written.
- The `EtcdHighWalFsyncLatency` 10ms threshold is stricter than the etcd mixin's 500ms warning / 1s critical, but 10ms aligns with etcd's hardware recommendation that a single etcd operation has a latency budget of roughly 10ms, so this is a defensible (conservative) choice.
- The `ServiceMonitor` example relies on `selector.matchLabels.component: etcd`, which assumes the user labels their headless service with `component: etcd`. The follow-up Service/Endpoints example does add that label, so the two snippets are internally consistent.
- The `Endpoints` API (`v1`) used in the manual Service+Endpoints example still works in current Kubernetes versions but is officially deprecated in favor of `EndpointSlice`. Not changed because it is still functional and broadly used in this exact pattern; worth noting for a future revision.
- talosctl `etcd status` and `logs etcd` commands are confirmed correct.
- Grafana dashboard ID 3070 ("Etcd by Prometheus") is a real published dashboard.
