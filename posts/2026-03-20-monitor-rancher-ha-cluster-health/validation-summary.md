# Validation Summary: How to Monitor Rancher HA Cluster Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (HA deployment)
- Kubernetes
- etcd
- Prometheus / PrometheusRule CRD (monitoring.coreos.com/v1)
- kube-state-metrics
- HAProxy / haproxy_exporter (prom/haproxy-exporter)
- Grafana
- Bash / curl
- OneUptime (external synthetic monitoring)

## Sources Consulted
- etcd v3.5 metrics documentation: https://etcd.io/docs/v3.5/metrics/
- etcd metrics latest list: https://etcd.io/docs/v3.5/metrics/etcd-metrics-latest/
- prometheus/haproxy_exporter README: https://github.com/prometheus/haproxy_exporter
- Prometheus Operator PrometheusRule CRD reference (monitoring.coreos.com/v1)
- kube-state-metrics deployment metrics reference (kube_deployment_status_replicas_ready labels)
- Rancher HA documentation (/healthz endpoint)

## Issues Found
1. **HAProxy exporter Docker invocation was incorrect.**
   - The original snippet passed the scrape URI via the environment variable `HAPROXY_SCRAPE_URI`. The official `prom/haproxy-exporter` (and upstream `prometheus/haproxy_exporter`) image does not read this env var; the scrape URI must be passed as a command-line flag (`--haproxy.scrape-uri=...`) appended to the container command.
   - Fix: replaced the `-e HAPROXY_SCRAPE_URI=...` form with the documented `--haproxy.scrape-uri=...` argument after the image name.

## Review Notes
- `etcd_server_id` is a real metric exposed by etcd (gauge with `server_id` label, value 1). `count(etcd_server_id)` works for counting reporting members, though upstream kube-prometheus-stack alerts more commonly use `up{job=~".*etcd.*"}`. Either is valid.
- The `EtcdInsufficientMembers` rule (`count(etcd_server_id) < 2`) is correct for a 3-node etcd cluster (quorum is 2). For a 5-node cluster the threshold would need to be `< 3`. The post implicitly assumes a 3-node cluster, which is the standard Rancher HA topology.
- The fsync latency threshold of 20 ms (`> 0.02`) is a reasonable warning level; etcd's healthy fsync target is < 10 ms, and many upstream rules alert at 0.5 s for critical. The chosen value is on the strict side but valid.
- `kube_deployment_status_replicas_ready` with labels `namespace` and `deployment` is a valid kube-state-metrics metric.
- Rancher does expose `/healthz` for unauthenticated health checks; `/ping` is also available and returns `pong` — either works for synthetic monitoring.
- `haproxy_backend_up` is shown only as a comment example. Depending on the exporter version, the equivalent metric may be exposed as `haproxy_backend_status` (with a `state="UP"` label) instead of `haproxy_backend_up`. The example is illustrative and acceptable, but readers should check their exporter version.
