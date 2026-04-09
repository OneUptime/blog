# Validation Summary: How to Configure Exporter Service Monitors in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (storage orchestration on Kubernetes)
- Ceph Exporter (per-node metrics collection)
- Prometheus Operator ServiceMonitors
- Kubernetes (kubectl, DaemonSets/Deployments, Services)
- Prometheus (targets, PromQL queries)

## Sources Consulted
- Rook Ceph Exporter Design Doc: https://github.com/rook/rook/blob/master/design/ceph/ceph-exporter.md
- Rook official exporter-service-monitor.yaml: https://github.com/rook/rook/blob/master/deploy/examples/monitoring/exporter-service-monitor.yaml
- Rook official service-monitor.yaml (MGR): https://github.com/rook/rook/blob/master/deploy/examples/monitoring/service-monitor.yaml
- Rook Prometheus Monitoring Docs: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Ceph Prometheus MGR Module Docs: https://docs.ceph.com/en/quincy/mgr/prometheus/
- Ceph Dashboard Docs: https://docs.ceph.com/en/latest/mgr/dashboard/
- IBM Ceph OSD Metrics Reference: https://www.ibm.com/docs/en/storage-ceph/6.1.0?topic=counters-ceph-osd-metrics

## Issues Found

1. **Incorrect terminology: "sidecar"** (Overview section). The Ceph exporter was described as a "sidecar" but it runs as dedicated per-node pods, not as a sidecar container within OSD pods. Changed to "dedicated per-node pods."

2. **Incorrect terminology: "DaemonSet"** (Architecture section and Summary). The `rook-ceph-exporter` is deployed as per-node Deployment pods by Rook, not as a Kubernetes DaemonSet resource. Changed "DaemonSet" to "per-node pods" in the Architecture section and removed "DaemonSet" from the Summary.

3. **Wrong port name in ServiceMonitor: `ceph-exporter`** (Ceph Exporter ServiceMonitor and Node Metadata Relabeling sections). The correct port name used by Rook's exporter service is `ceph-exporter-http-metrics`, not `ceph-exporter`. This was confirmed against the official Rook exporter-service-monitor.yaml example. Changed both occurrences.

4. **Invalid MGR dashboard metrics endpoint removed** (MGR Module Metrics section). The second endpoint in the MGR ServiceMonitor attempted to scrape Prometheus metrics from the `dashboard` port at `/metrics` over HTTPS. The Ceph Dashboard is a web UI and does not expose Prometheus-format metrics at `/metrics`. Prometheus metrics are only served by the `prometheus` MGR module on the `http-metrics` port (9283). The official Rook service-monitor.yaml only scrapes `http-metrics`. Removed the invalid dashboard endpoint.

## Review Notes
- The `http-metrics` scrape interval of 5s is aggressive. The Rook documentation examples typically use 5s-10s, so this is within acceptable range but users with large clusters may want to increase it to reduce MGR load.
- The troubleshooting section suggests using `curl` inside the exporter pod (`kubectl exec ... -- curl`). Some minimal container images may not include curl. Users may need to use `kubectl port-forward` instead or verify curl is available in the container.
- The metric `ceph_osd_op_r_latency_sum` is a valid Ceph metric and correctly used as an example exporter-specific query.
