# Validation Summary: How to Handle Split-Brain Scenarios in Rook Stretch Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph Stretch Clusters / Stretch Mode
- Ceph Monitor quorum and monmaptool
- Kubernetes (kubectl)

## Sources Consulted
- Rook Stretch Cluster Documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/
- Rook Disaster Recovery Documentation: https://rook.io/docs/rook/v1.9/Troubleshooting/disaster-recovery/
- Rook CephCluster CRD Documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook stretch cluster example YAML: https://github.com/rook/rook/blob/master/deploy/examples/cluster-stretched.yaml
- Ceph Stretch Mode Documentation: https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Rook kubectl-rook-ceph Issue #77 (admin socket access): https://github.com/rook/kubectl-rook-ceph/issues/77
- IBM Ceph Stretch Mode Recovery Documentation: https://www.ibm.com/docs/en/storage-ceph/7.0.0?topic=mode-forcing-stretch-cluster-into-recovery-healthy

## Issues Found

### Issue 1: Non-existent `mon force_quorum_update` command (Critical)
**What was wrong:** Step 2 used the command `ceph daemon mon.<name> mon_command '{"prefix": "mon force_quorum_update"}'`, which does not exist in any version of Ceph. No documentation, source code, or community reference mentions this command.

**What was changed:** Replaced the fabricated command with the documented monmaptool-based recovery procedure: extracting the monmap from a surviving monitor, removing unreachable monitors with `monmaptool --rm`, and injecting the modified monmap. Also added the stretch-mode specific recovery command `ceph osd force_recovery_stretch_mode --yes-i-really-mean-it` for post-quorum-recovery use.

**Why:** The monmaptool injection approach is the canonical, documented procedure for recovering Ceph monitor quorum when quorum cannot form normally. It is documented in both Rook disaster recovery docs and upstream Ceph documentation.

### Issue 2: `ceph daemon` cannot run from tools pod (Critical)
**What was wrong:** The original command ran `ceph daemon mon.<name>` from `deploy/rook-ceph-tools`. The `ceph daemon` command connects via a local Unix admin socket (`/var/run/ceph/ceph-mon.<id>.asok`), which only exists inside the monitor daemon's own pod. The tools pod has no monitor daemon running, so this command would fail.

**What was changed:** Changed the procedure to exec directly into the surviving monitor pod (`kubectl -n rook-ceph exec -it <surviving-mon-pod>`), which is where monitor-level commands must be executed.

**Why:** Admin socket commands require direct access to the daemon's container. This is confirmed by Rook documentation and GitHub issues (rook/kubectl-rook-ceph#77).

### Issue 3: Missing `subFailureDomain` in stretch cluster YAML (Moderate)
**What was wrong:** The CephCluster YAML configuration was missing the `subFailureDomain: host` field under `stretchCluster`. This field specifies how data replicas are distributed within each zone.

**What was changed:** Added `subFailureDomain: host` to the stretch cluster configuration, matching the official Rook example at `deploy/examples/cluster-stretched.yaml`.

**Why:** The official Rook stretch cluster example and documentation include this field. It ensures OSD placement groups are spread across different hosts within each zone.

### Issue 4: Missing `allowMultiplePerNode` in stretch cluster YAML (Minor)
**What was wrong:** The YAML was missing `allowMultiplePerNode: false` under `spec.mon`.

**What was changed:** Added `allowMultiplePerNode: false` to match the official Rook stretch cluster example.

**Why:** For production stretch clusters, this setting prevents multiple monitors from being placed on the same node, which is important for fault tolerance.

### Issue 5: Redundant `arbiter: false` on non-arbiter zones (Minor)
**What was wrong:** Non-arbiter zones explicitly set `arbiter: false`, which is the default value and unnecessary.

**What was changed:** Removed the redundant `arbiter: false` from zone-a and zone-b entries, matching the official Rook example style.

**Why:** The `arbiter` field defaults to `false` when omitted. Removing it aligns with the canonical example and reduces noise.

## Review Notes
- The `ceph quorum_status` and `ceph health detail` commands in the detection section are correct, but may timeout or fail to connect during a true split-brain since they require an active monitor connection. The blog could note that these commands may hang when no monitor has quorum, and that checking individual monitor pod logs may be more reliable for confirming split-brain state.
- The post correctly explains that true split-brain only occurs when all three communication paths (zone-a to zone-b, zone-a to arbiter, zone-b to arbiter) are severed simultaneously.
- The monmaptool recovery procedure carries significant risk of permanent data loss if performed incorrectly. The post's warning about this being a last resort is appropriate, and the updated text includes an explicit warning about potential cluster destruction.
- Ceph stretch mode has built-in automatic degraded mode handling when one data zone fails but the arbiter remains reachable. The `ceph osd force_recovery_stretch_mode` and `ceph osd force_healthy_stretch_mode` commands are available for cases where automatic recovery doesn't complete properly.
