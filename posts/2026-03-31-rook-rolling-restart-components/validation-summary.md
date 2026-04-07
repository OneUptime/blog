# Validation Summary: How to Perform Rolling Restarts of Rook-Ceph Components

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (OSD, MON, MGR, MDS, RGW daemons)
- Kubernetes (kubectl, pod management, deployments, rollout restarts)

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Ceph documentation on daemon management: https://docs.ceph.com/en/latest/rados/operations/

## Issues Found
- **`-it` flags in automation script**: The automation script at the end of the post used `kubectl exec -it` inside a non-interactive bash script loop. The `-i` (interactive) and `-t` (TTY allocation) flags are inappropriate in a scripted/non-interactive context and will produce warnings like "stdin is not a terminal" or fail to allocate a TTY. Removed `-it` from the `kubectl exec` call within the script, leaving it as `kubectl exec deploy/rook-ceph-tools --`. The interactive `kubectl exec -it` calls earlier in the post (used for manual commands) are correct and were left unchanged.

## Review Notes
- The automation script uses a simple `sleep 30` between OSD restarts rather than actively waiting for the pod to reach Ready state and confirming HEALTH_OK. For production use, a more robust approach would poll for pod readiness and verify `HEALTH_OK` (not just grep for `HEALTH`, which also matches `HEALTH_WARN`). However, the script is presented as a basic example and this is a quality consideration, not a correctness error.
- All pod naming conventions (`rook-ceph-osd-0-*`, `rook-ceph-mon-a-*`, `rook-ceph-mgr-a`, `rook-ceph-mds-myfs-a-*`, `rook-ceph-rgw-my-store-a`) match current Rook naming patterns.
- Label selectors (`app=rook-ceph-osd`, `ceph-osd-id=0`, `app=rook-ceph-mds`) are correct for Rook-managed pods.
- The advice to restart one OSD at a time and verify `active+clean` PG state before proceeding is correct operational practice.
- The MDS active/standby failover description is accurate.
