# Validation Summary: How to Monitor etcd with Prometheus on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, `talosctl`)
- etcd (metrics, maintenance, snapshot, defrag)
- Prometheus (Prometheus Operator, ServiceMonitor, PrometheusRule)
- Kubernetes (Service, Endpoints, headless services)
- PromQL (alerting expressions, histogram_quantile)
- Grafana (community dashboards)

## Sources Consulted
- [Talos: Expose the Etcd Metrics Endpoint](https://docs.siderolabs.com/kubernetes-guides/monitoring-and-observability/etcd-metrics)
- [Talos v1.7 CLI reference](https://docs.siderolabs.com/talos/v1.7/reference/cli/) (talosctl etcd subcommands incl. `status`, `members`, `snapshot`, `defrag`, `alarm list`)
- [Talos v1.7 v1alpha1 config reference](https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/) (`cluster.etcd.extraArgs`)
- [etcd v3.5 monitoring guide](https://etcd.io/docs/v3.5/op-guide/monitoring/)
- [etcd v3.5 metrics reference](https://etcd.io/docs/v3.5/metrics/) (definitions of `etcd_server_has_leader`, `etcd_server_is_leader`, `etcd_server_leader_changes_seen_total`, `etcd_disk_wal_fsync_duration_seconds`, `etcd_disk_backend_commit_duration_seconds`, `etcd_mvcc_db_total_size_in_bytes`, `etcd_server_proposals_*`)
- [Grafana dashboard 3070 "Etcd by Prometheus"](https://grafana.com/grafana/dashboards/3070-etcd/)
- [Prometheus Operator ServiceMonitor / PrometheusRule CRDs (monitoring.coreos.com/v1)](https://prometheus-operator.dev/docs/api-reference/api/)

## Issues Found
1. **Wrong metrics port in the "How etcd Runs on Talos Linux" section.** The post originally stated etcd metrics are exposed "typically on port 2379". Port 2379 is etcd's client API port (mTLS-protected on Talos); the dedicated Prometheus metrics endpoint is 2381, which is what the rest of the post correctly uses. Updated the sentence to say port 2381 and clarified why 2379 is not what Prometheus should scrape.
2. **Incorrect comment on `etcd_server_has_leader`.** The post described this metric as "Number of active peers", but it is a 0/1 gauge indicating whether the member currently has a leader (per etcd's official metrics docs). Replaced the comment with the correct meaning.
3. **Overstated Grafana dashboard provenance.** Dashboard ID 3070 was labelled "the official etcd dashboard". It is a community dashboard ("Etcd by Prometheus") published on grafana.com, not an official upstream etcd project release. Reworded to "the popular 'Etcd by Prometheus' community dashboard" to avoid misleading readers.

## Review Notes
- The Endpoints v1 + headless Service pattern used to expose external etcd nodes to Prometheus still works in current Kubernetes, but EndpointSlices (`discovery.k8s.io/v1`) are the preferred mechanism going forward. Not changed because the Endpoints approach remains supported and is widely used in similar guides.
- `etcd_debugging_mvcc_keys_total` lives under the `etcd_debugging_*` namespace, which etcd explicitly marks as experimental/unstable and subject to removal. Worth keeping an eye on for future versions of the post.
- The 10ms WAL fsync and 25ms backend commit guidance matches etcd's published hardware recommendations and the SlowDiskWrites alert threshold of 100ms (`> 0.1`) is consistent with kube-prometheus / etcd-mixin defaults.
- The `talosctl patch machineconfig --patch @file.yaml` invocation matches current Talos CLI syntax; nodes must be rebooted (or the etcd service restarted) for the new `listen-metrics-urls` to take effect, which the post does not call out explicitly but is not strictly an error.
