# Validation Summary: How to Set Up Grafana Dashboard 5336 for Ceph OSD Details

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes Ceph operator)
- Grafana (dashboard visualization)
- Prometheus (metrics collection)
- Ceph OSD (Object Storage Daemon) monitoring
- PromQL (Prometheus Query Language)

## Sources Consulted
- Grafana HTTP API documentation for dashboard import endpoint (https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/)
- Ceph Prometheus module documentation (https://docs.ceph.com/en/latest/mgr/prometheus/)
- Ceph Prometheus module source code for OSD metric names and labels
- Ceph OSD perf counter definitions for metric verification

## Issues Found

1. **Grafana API import command was incorrect** (Step 1, API import section): The original command piped raw dashboard JSON directly from `grafana.com/api/dashboards/5336/revisions/latest/download` to the `/api/dashboards/import` endpoint. The Grafana import API requires the dashboard JSON to be wrapped in a payload object with `"dashboard"`, `"overwrite"`, `"inputs"`, and `"folderId"` keys. Fixed by storing the downloaded JSON in a variable and constructing the proper wrapped payload.

2. **`host` label should be `hostname`** (Step 3, OSD Tree Topology Panel): The `ceph_osd_metadata` metric uses the label `hostname`, not `host`. The `group_left(host, device_class)` clause and the corresponding column reference were both updated to use `hostname`.

## Review Notes
- The "Journal Write Ops" panel listed under "Key Panels in Dashboard 5336" is a vestige of FileStore-era Ceph. Modern Ceph deployments use BlueStore (default since Luminous/2017), which uses a Write-Ahead Log (WAL) instead of a journal. Since this section describes the existing community dashboard's panels rather than recommending users create them, no change was made, but readers on BlueStore deployments should be aware this panel may show no data or be irrelevant.
- The Ceph metric names (`ceph_osd_apply_latency_ms`, `ceph_osd_commit_latency_ms`, `ceph_osd_op_r`, `ceph_osd_op_w`, `ceph_osd_up`, `ceph_osd_metadata`) were all verified as correct.
- The PromQL queries for outlier detection and IOPS breakdown are syntactically correct and use appropriate functions.
- The default Ceph MGR Prometheus exporter port (9283) is correct.
