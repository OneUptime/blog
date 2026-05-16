# Validation Summary: How to Monitor etcd Performance in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl CLI, machine config)
- etcd (Prometheus metrics, alarms, members)
- Kubernetes (control plane, kube-system namespace)
- Prometheus (PromQL, histogram_quantile)
- Prometheus Operator / kube-prometheus-stack (ServiceMonitor, PodMonitor, PrometheusRule CRDs)
- Grafana (dashboard ID 3070)
- Helm (chart installation)

## Sources Consulted
- etcd Metrics Reference (v3.5): https://etcd.io/docs/v3.5/metrics/
- etcd Maintenance docs: https://etcd.io/docs/v3.4/op-guide/maintenance/
- Sidero Labs - Expose the Etcd Metrics Endpoint: https://docs.siderolabs.com/kubernetes-guides/monitoring-and-observability/etcd-metrics
- Sidero Labs - talosctl CLI reference: https://docs.siderolabs.com/talos/v1.11/reference/cli
- Sidero Labs - etcd Maintenance: https://docs.siderolabs.com/talos/v1.9/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance
- etcd PR #9587 (etcd_server_is_leader): https://github.com/etcd-io/etcd/pull/9587
- Prometheus Operator API: ServiceMonitor / PodMonitor / PrometheusRule CRDs

## Issues Found

1. **Incorrect metric name `etcd_request_duration_seconds`** — The post used `etcd_request_duration_seconds_bucket{type="Range"|"Put"}` to measure etcd request latency. This metric is not exposed by etcd itself; it is a Kubernetes API server metric. Etcd's own request-latency exposition comes from go-grpc-prometheus as `grpc_server_handling_seconds_bucket{grpc_service="etcdserverpb.KV", grpc_method="Range"|"Put"}`. Replaced both PromQL examples with the correct grpc metric.

2. **Inaccurate claim that etcd metrics are exposed on port 2381 "by default" in Talos** — Port 2381 is correct, but Talos does not expose the metrics endpoint externally out of the box. The user must set `cluster.etcd.extraArgs.listen-metrics-urls: "http://0.0.0.0:2381"` in the machine config. Updated the introductory paragraph to call this out.

3. **Incorrect statement that "Talos runs etcd as a static pod"** — In Talos Linux, etcd runs as a Talos system service managed by `machined`, not as a Kubernetes static pod. It does not show up in `kubectl get pods`. The original Service example relied on a pod selector (`component: etcd`), which cannot work in Talos. Removed the broken pod selector and added a comment explaining that the Service needs manually-created Endpoints/EndpointSlices pointing at the control plane node IPs on port 2381.

4. **PodMonitor section was misleading for Talos** — A PodMonitor selects Kubernetes pods, which won't match Talos's etcd (it is not a pod). Reworded the leading sentence to note that PodMonitor only applies when etcd runs as a Kubernetes pod (which Talos does not do).

5. **Wrong talosctl subcommand `talosctl services etcd`** — `talosctl services` lists all services and takes no service-name argument; to query a single service you use the singular `talosctl service <name>`. Changed to `talosctl service etcd`.

## Review Notes

- All other etcd metric names referenced in the post (`etcd_disk_wal_fsync_duration_seconds_bucket`, `etcd_disk_backend_commit_duration_seconds_bucket`, `etcd_network_peer_round_trip_time_seconds_bucket`, `etcd_network_peer_sent_failures_total`, `etcd_mvcc_db_total_size_in_bytes`, `etcd_mvcc_db_total_size_in_use_in_bytes`, `etcd_server_leader_changes_seen_total`, `etcd_server_is_leader`, `etcd_server_proposals_failed_total`) are valid and documented in etcd's metrics reference.
- talosctl commands `etcd status`, `etcd members`, `etcd alarm list`, `get etcdmembers`, and `logs etcd --tail 100` are all valid.
- The 10ms WAL fsync threshold and the 8GB default etcd database size limit (and the post's 6GB warning threshold) align with etcd's documented recommendations.
- Grafana dashboard ID 3070 is a real community etcd dashboard.
- The Helm chart name `prometheus-community/kube-prometheus-stack` and the service name `prometheus-grafana` are correct for that chart.
- Future improvement (not a current error): readers may want a worked example of the Endpoints/EndpointSlice resource to pair with the headless Service, since the post now points out the requirement but does not include the YAML.
