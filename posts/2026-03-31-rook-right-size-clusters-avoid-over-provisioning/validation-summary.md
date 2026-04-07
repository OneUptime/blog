# Validation Summary: How to Right-Size Ceph Clusters to Avoid Over-Provisioning

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (CLI tools: `ceph df`, `ceph osd df`, `ceph daemon`, `ceph config`)
- Rook (CephCluster CRD for Kubernetes)
- Prometheus / PromQL (`predict_linear`, `ceph_cluster_total_used_bytes` metric)
- Grafana (referenced for capacity visualization)
- Python 3 (inline JSON parsing scripts)
- BlueStore (Ceph storage backend cache configuration)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph OSD configuration reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph BlueStore configuration: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Prometheus ceph-mgr module metrics: https://docs.ceph.com/en/latest/mgr/prometheus/

## Issues Found
No technical issues found.

## Review Notes
- The `awk` column references in `ceph osd df | awk 'NR>1 {print $7}'` and `ceph df | awk '$4 == "0" && $5 == "0" {print $1}'` are version-dependent. Newer Ceph releases (Quincy, Reef) added columns to `ceph osd df` output (DATA, OMAP, META), shifting `%USE` to a higher column number. Readers on newer Ceph versions may need to adjust column numbers. This is a common caveat for CLI-parsing examples and not strictly an error.
- The `bytes_used` field in `ceph df detail --format json` has been supplemented by `stored` in newer Ceph versions, though `bytes_used` remains present for backward compatibility.
- The nearfull/backfillfull/full ratio values (0.75/0.85/0.95) are more conservative than Ceph defaults (0.85/0.90/0.95), which is appropriate for a right-sizing guide focused on avoiding over-utilization risks.
