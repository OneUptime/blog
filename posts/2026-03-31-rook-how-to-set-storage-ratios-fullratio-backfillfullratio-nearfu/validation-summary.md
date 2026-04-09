# Validation Summary: How to Set Storage Ratios (fullRatio, backfillFullRatio, nearFullRatio) in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- CephCluster CRD (Custom Resource Definition)
- Kubernetes CLI (kubectl)
- Prometheus / PrometheusRule for monitoring
- RADOS (Reliable Autonomic Distributed Object Store)

## Sources Consulted
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph documentation on full ratio settings (https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/)
- Ceph MGR Prometheus module exported metrics (https://docs.ceph.com/en/latest/mgr/prometheus/)
- Cross-referenced with other validated blog posts in the same repository covering Rook OSD nearfull, pool full, and Ceph health status topics

## Issues Found
1. **Invalid Prometheus metric `ceph_osd_utilization`**: The alert rule used `ceph_osd_utilization > 80`, but this metric does not exist in the standard Ceph MGR Prometheus module. Replaced with the correct expression `(ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) * 100 > 80`, which calculates OSD utilization percentage from the actual exported metrics. Also updated the label reference from `$labels.osd` to `$labels.ceph_daemon` to match the label name used by the Ceph Prometheus exporter.

## Review Notes
- The CephCluster CRD configuration path (`spec.storage.fullRatio`, etc.) is correct and verified across multiple Rook documentation sources and other blog posts.
- Default values (0.85, 0.90, 0.95) are accurate for Ceph.
- The ENOSPC error behavior when fullRatio is exceeded is correct.
- The emergency command `ceph osd set-full-ratio 0.97` is valid Ceph CLI syntax.
- The `rados -p <pool> rm <object>` syntax is correct.
- The `ceph_health_status == 2` alert for HEALTH_ERR is correct (0=OK, 1=WARN, 2=ERR).
- The `ceph osd dump | grep -E "full|near"` and `ceph osd df` commands are correct for viewing ratios and utilization.
