# Validation Summary: How to Fix Cluster Stuck in active+degraded State

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph Placement Groups (PGs)
- Ceph OSDs (Object Storage Daemons)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation on PG states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on OSD management: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph configuration reference for recovery options: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Kubernetes kubectl reference for pod operations: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
No technical issues found.

## Review Notes
- The summary section references `osd_recovery_max_active` generically while the code example uses the more specific `osd_recovery_max_active_hdd`. Both are valid Ceph config options (the HDD/SSD variants override the general one), so this is not an error, but a future revision could mention `osd_recovery_max_active_ssd` for SSD-backed clusters as well.
- The guide covers marking an OSD `out` for permanently failed disks, which is the correct immediate action to trigger recovery. A complete OSD removal (via `ceph osd purge` or CRUSH map cleanup) is a separate concern and outside the scope of this article.
- The `ceph osd dump | grep -E "min_size|size"` command is functional but produces verbose output since every pool line contains "size". This is acceptable for a diagnostic check.
