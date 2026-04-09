# Validation Summary: How to Fix OSD_FILESTORE Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (storage cluster, health checks, OSD management)
- Rook-Ceph (Kubernetes operator for Ceph)
- BlueStore and FileStore OSD backends
- ceph-volume LVM provisioning
- Kubernetes (kubectl, deployments)

## Sources Consulted
- Ceph official documentation on OSD backends and BlueStore migration (https://docs.ceph.com/en/latest/rados/operations/bluestore-migration/)
- Ceph official documentation on OSD management commands (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- Ceph health checks reference for OSD_FILESTORE (https://docs.ceph.com/en/latest/rados/operations/health-checks/#osd-filestore)
- Rook-Ceph documentation on OSD management (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/)

## Issues Found

1. **Bug in multi-OSD migration script (grep logic)**: The script used `while ceph status | grep -qv "active+clean"` to wait for recovery. The `-v` flag inverts the match, so `grep -qv` returns success (exit 0) if *any* line does not contain "active+clean". Since `ceph status` outputs many lines (headers, cluster info, etc.), this condition is almost always true, causing the loop to run forever. Fixed to `while ! ceph status | grep -q "active+clean"` which correctly loops until at least one line contains "active+clean".

2. **Missing OSD purge step in Rook-Ceph section**: The Rook migration procedure was missing the `ceph osd purge` command. Without purging, the OSD remains in the CRUSH map and cluster metadata even after the Kubernetes deployment is deleted, which prevents clean reprovisioning. Added `ceph osd purge 0 --yes-i-really-mean-it` via the toolbox pod. Also fixed the comment that incorrectly mentioned deleting a configmap when the command only deleted the deployment.

## Review Notes
- The wait-for-clean check (`grep -q "active+clean"`) is a simplified heuristic. In production, operators should verify that all PGs are active+clean (not just that the string appears in output) before proceeding. A more robust check would parse `ceph pg stat` output or use `ceph health` to confirm HEALTH_OK.
- FileStore support was fully removed in Ceph Reef (18.x). The post correctly notes it is deprecated and removed in recent versions, but operators on older clusters (pre-Reef) may still encounter this warning.
- The Rook-Ceph migration steps are a simplified overview. In production, operators should consult the Rook documentation for their specific version, as the OSD removal workflow has evolved across Rook releases.
