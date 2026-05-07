# Validation Summary: How to Monitor etcd Health in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Rancher RKE
- Rancher RKE2
- Kubernetes
- etcd
- Prometheus
- PromQL
- Grafana

## Sources Consulted
- Rancher Monitoring architecture and scrape model: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher built-in dashboards: https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/monitoring-and-alerting/built-in-dashboards
- Upstream etcd Grafana dashboard shipped with kube-prometheus-stack: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/templates/grafana/dashboards-1.14/etcd.yaml
- RKE2 server configuration reference (`etcd-expose-metrics`): https://docs.rke2.io/reference/server_config
- RKE2 network requirements (etcd metrics port `2381`): https://docs.rke2.io/install/requirements
- RKE2 metrics reference: https://docs.rke2.io/reference/metrics
- etcd monitoring guide: https://etcd.io/docs/v3.6/op-guide/monitoring/
- etcd metrics reference: https://etcd.io/docs/v3.7/metrics/etcd-metrics-latest/
- etcd cluster status and health commands: https://etcd.io/docs/v3.6/tasks/operator/how-to-check-cluster-status/
- etcd maintenance commands: https://etcd.io/docs/v3.5/op-guide/maintenance/
- Prometheus `histogram_quantile()` and `rate()` guidance: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Upstream kube-prometheus-stack etcd defaults (`2381`, `http-metrics`, `scheme: http`): https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- etcdctl endpoint command implementation and JSON field names: https://github.com/etcd-io/etcd/blob/release-3.6/etcdctl/ctlv3/command/ep_command.go

## Issues Found
- The RKE2 `etcdctl` example used `server-client.crt` and `server-client.key`, while current RKE2 documentation exposes the etcd client connection via `/var/lib/rancher/rke2/server/tls/etcd/client.crt` and `/var/lib/rancher/rke2/server/tls/etcd/client.key`. I updated the command to use the documented client certificate files and set reusable `ETCDCTL_*` environment variables.
- The standalone `etcdctl endpoint status --write-out=table` command was incomplete because it omitted the container context for RKE and the TLS/endpoint context for RKE2. I replaced it with runnable RKE and RKE2 examples and clarified that the `DB SIZE` column in the status output is the database size.
- The RKE2 metrics exposure section incorrectly advised creating a standalone HTTPS `ServiceMonitor` with TLS files. Rancher Monitoring documents that etcd on RKE2 is scraped through PushProx via the built-in `rke2Etcd.enabled` integration, and RKE2 documents a dedicated etcd metrics port on `2381`. I replaced that section with the correct Rancher integration guidance and noted `etcd-expose-metrics: true` only for direct, non-Rancher scraping.
- The metric comment for `etcd_server_is_leader` described it as the “current leader,” but the metric actually indicates whether a given member is the leader. I corrected the description.
- The description of `etcd_mvcc_db_total_size_in_use_in_bytes` implied it was specifically a post-compaction value. The official etcd metrics reference describes it as the logical database size in use, so I updated the wording.

## Review Notes
- The post remains technically useful after correction and is appropriate to keep.
- Some metrics in the `etcd_debugging_*` namespace are troubleshooting-oriented rather than the most stable alerting surface. They are acceptable for investigation, but etcd’s stable `etcd_*` metrics are better for long-term alerting where possible.
