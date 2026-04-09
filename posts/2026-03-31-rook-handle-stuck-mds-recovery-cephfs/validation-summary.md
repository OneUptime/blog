# Validation Summary: How to Handle Stuck MDS Recovery in CephFS

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server)
- CephFS (Ceph Filesystem)
- Kubernetes (kubectl CLI)
- cephfs-journal-tool

## Sources Consulted
- Ceph official documentation on MDS states and recovery: https://docs.ceph.com/en/latest/cephfs/disaster-recovery/
- Ceph admin socket vs `ceph tell` documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph health checks reference: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Filesystem/ceph-filesystem-crd/
- Ceph MDS client eviction documentation: https://docs.ceph.com/en/latest/cephfs/eviction/
- cephfs-journal-tool documentation: https://docs.ceph.com/en/latest/cephfs/disaster-recovery/#journal-export

## Issues Found

### Issue 1: `ceph daemon` used from tools pod (Step 2)
- **What was wrong:** The post used `ceph daemon mds.myfs.a session ls` and `ceph daemon mds.myfs.a session evict` from the `rook-ceph-tools` pod. The `ceph daemon` command connects to a local admin socket, which is only available inside the MDS pod itself. Running it from the tools pod would fail with a "connect" error because the admin socket file does not exist there.
- **What was changed:** Replaced `ceph daemon` with `ceph tell`, which routes commands through the Ceph monitors and works from any pod with Ceph client access. Also updated the eviction command from `session evict <client-id>` to `client evict id=<client-id>` to use the correct `ceph tell` parameter format.
- **Why:** `ceph tell` is the correct mechanism for sending admin commands to remote Ceph daemons. `ceph daemon` only works when you have local access to the daemon's admin socket.

### Issue 2: `MDS_REPLAY_LAGGED` is not a real Ceph health warning (Identifying Stuck Recovery)
- **What was wrong:** The post listed `MDS_REPLAY_LAGGED` as a health warning that indicates stuck recovery. This is not a recognized Ceph health check code.
- **What was changed:** Replaced `MDS_REPLAY_LAGGED` with `FS_WITH_FAILED_MDS`, which is the actual Ceph health warning emitted when an MDS daemon has failed and the filesystem is affected.
- **Why:** Using a non-existent health warning code would confuse readers who grep for it in `ceph health detail` output and find nothing.

### Issue 3: Missing prerequisite for `cephfs-journal-tool` (Step 5)
- **What was wrong:** The post showed running `cephfs-journal-tool --rank=myfs:0 journal reset` without first stopping the MDS. The journal tool requires exclusive access to the journal — running it while an MDS is active or attempting recovery on the same rank can cause corruption or the tool will refuse to run.
- **What was changed:** Added `ceph fs fail myfs` before the journal reset to mark the filesystem as failed (preventing any MDS from joining), and added `ceph fs set myfs joinable true` after the reset to bring it back online.
- **Why:** This is a critical safety prerequisite documented in the Ceph disaster recovery guide. Omitting it could lead to further data corruption or confusing error messages.

### Issue 4: `ceph mds dump | grep damage` replaced with `ceph tell` damage listing (Step 5)
- **What was wrong:** `ceph mds dump` outputs the MDS map, which does not directly list damage entries. Grepping for "damage" in this output is unreliable for detecting journal damage.
- **What was changed:** Replaced with `ceph tell mds.myfs:0 damage ls`, which directly queries the MDS for its damage table — the authoritative source for recorded metadata damage.
- **Why:** The `damage ls` command provides structured output of actual damage entries, making it far more useful for diagnosing journal issues.

## Review Notes
- The `kubectl delete pod -l app=rook-ceph-mds --grace-period=0 --force` command in Step 3 deletes ALL MDS pods (active and standby) since the label selector matches all of them. In practice, targeting the specific stuck pod by name would be safer. This is not technically wrong but is aggressive — readers should be aware it kills all MDS instances.
- The `watch` command inside `kubectl exec` (Step 3) assumes `watch` is installed in the Rook toolbox image. This is typically the case but may vary in custom images.
- The ordering of Steps 3 and 4 could be swapped — `ceph mds fail` (Step 4) is a less disruptive first attempt than deleting all MDS pods (Step 3). However, the current ordering is a valid approach and the post frames Step 4 as a next escalation.
