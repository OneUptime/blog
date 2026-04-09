# Validation Summary: How to Handle Full OSDs and mon_osd_full_ratio in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Ceph OSDs (Object Storage Daemons)
- Ceph RBD (RADOS Block Device) snapshots
- kubectl (Kubernetes CLI)
- Prometheus (monitoring/alerting)

## Sources Consulted
- Ceph official documentation on OSD full ratios and capacity management (https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/)
- Ceph CLI reference for `ceph osd set-full-ratio`, `ceph osd pool set-quota`, `rados`, and `rbd` commands (https://docs.ceph.com/en/latest/man/)
- Rook documentation on CephCluster storage configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph documentation on RADOS pool operations (https://docs.ceph.com/en/latest/rados/operations/pools/)

## Issues Found
No technical issues found.

## Review Notes
- The default threshold values (nearfull 0.85, backfillfull 0.90, full 0.95) are accurate for all modern Ceph releases (Nautilus through Squid).
- In newer Ceph versions (Pacific+), ratios can also be managed via the centralized config database (`ceph config set mon mon_osd_full_ratio <value>`), but the `ceph osd set-full-ratio` convenience command used in the post remains valid and is the more common approach in operational guides.
- The Rook CephCluster YAML for adding OSDs uses the node-specific device list format, which is one of several valid approaches (useAllNodes/useAllDevices being another). The example is correct.
- The pool quota value of 107374182400 bytes correctly corresponds to 100 GiB; this could optionally be annotated with a comment for reader clarity, but is not an error.
