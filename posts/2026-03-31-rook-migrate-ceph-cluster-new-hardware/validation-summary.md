# Validation Summary: How to Migrate a Ceph Cluster to New Hardware

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- cephadm (Ceph orchestrator)
- Kubernetes (kubectl)
- CRUSH map management
- Ceph OSD lifecycle (out, purge)
- Ceph monitor migration

## Sources Consulted
- Ceph official documentation on `ceph osd purge` command behavior (purge consolidates CRUSH removal, auth deletion, and OSD map removal into a single command)
- Rook source code (`pkg/operator/ceph/cluster/osd/labels.go` and `osd.go`) for OSD pod label definitions
- Rook documentation on CephCluster storage spec and OSD management
- Ceph documentation on monitor management (`ceph mon remove`, `ceph orch daemon add mon`)

## Issues Found

### Issue 1: Redundant commands after `ceph osd purge` (Step 4)
- **What was wrong:** The for loop included `ceph auth del osd.$osd` and `ceph osd crush remove osd.$osd` after `ceph osd purge $osd --yes-i-really-mean-it`. The `ceph osd purge` command already removes the OSD from the CRUSH map, deletes its cephx auth key, and removes it from the OSD map. The subsequent commands are redundant and would produce `ENOENT` errors since those entries are already removed by purge.
- **What was changed:** Removed the redundant `ceph auth del` and `ceph osd crush remove` commands from the for loop, leaving only `ceph osd purge`.
- **Why:** `ceph osd purge` was introduced specifically to consolidate these three separate operations into one. Running them after purge is misleading and would confuse readers when the commands error out.

### Issue 2: Incorrect Rook OSD pod label selector (Step 6)
- **What was wrong:** The command `kubectl -n rook-ceph delete pod -l app=rook-ceph-osd,node=old-node-1` used `node=old-node-1` as a label selector. Rook does not apply a `node` label to OSD pods. This command would silently match zero pods and delete nothing.
- **What was changed:** Updated to `kubectl -n rook-ceph delete deployment -l app=rook-ceph-osd,topology-location-host=old-node-1`. This uses the correct Rook label (`topology-location-host`) and targets deployments rather than pods (since deleting a pod managed by a deployment would just cause it to be recreated).
- **Why:** Rook labels OSD pods with `topology-location-host=<hostname>` (derived from CRUSH topology), not `node=<hostname>`. Confirmed via Rook source code in the OSD labels module.

## Review Notes
- The post mixes Rook-managed and native Ceph (cephadm) approaches across different steps. This is reasonable for a guide covering both environments, but readers using only Rook should be aware that manually running `ceph osd purge` on Rook-managed OSDs may conflict with the Rook operator's reconciliation loop. In a pure Rook environment, the preferred approach is to remove nodes from the CephCluster spec and let the operator handle OSD removal.
- Step 3 (Migrate Monitors) is light on Rook-specific details -- it shows a comment placeholder rather than actual Rook monitor placement configuration. This is not incorrect but could be more helpful.
- The `ceph orch daemon add mon new-node-1` command in Step 3 is a simplified form that works when the host is already registered with the orchestrator. In some setups, specifying the IP/network may be required.
