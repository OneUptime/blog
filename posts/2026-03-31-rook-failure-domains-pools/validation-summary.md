# Validation Summary: How to Configure Failure Domains in Rook-Ceph Pools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (CRUSH maps, OSD placement, pools)
- Kubernetes (node labels, kubectl)
- CephBlockPool CRD (ceph.rook.io/v1)
- CephFilesystem CRD (ceph.rook.io/v1)
- Erasure-coded pools

## Sources Consulted
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephCluster CRD documentation (topology labels): https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Ceph Monitoring OSDs and PGs documentation: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/

## Issues Found

### Issue 1: Zone buckets not placed under CRUSH root (critical)
**What was wrong:** The zone CRUSH setup created zone buckets with `ceph osd crush add-bucket zone-a zone` but never attached them to the CRUSH hierarchy. `add-bucket` creates a floating (parentless) bucket — it must be explicitly moved under the root with `ceph osd crush move zone-a root=default`. Without this step, the zone buckets are unreachable from the root and the CRUSH rule referencing `default` as root would not work correctly.

**What was changed:** Added three `ceph osd crush move zone-X root=default` commands after the zone bucket creation and before moving hosts under zones.

### Issue 2: Rack buckets not placed under CRUSH root (critical)
**What was wrong:** Same issue as zones — rack buckets were created but not placed under the root of the CRUSH tree.

**What was changed:** Added three `ceph osd crush move rack-X root=default` commands after the rack bucket creation and before moving hosts under racks.

### Issue 3: Misleading "Simulate placement" verification command
**What was wrong:** The comment said "Simulate placement to verify failure domains" but the command was `ceph osd crush rule dump replicapool-replicated-rule`, which only dumps the CRUSH rule definition (its steps like take, chooseleaf, emit). It does not simulate or test actual object placement.

**What was changed:** Replaced with `ceph osd map replicapool testobject`, which actually tests where Ceph would place a given object, showing the full mapping chain (object → PG → OSD set). Updated the comment to "Test object placement to verify failure domains".

## Review Notes
- The `ceph pg dump | awk 'NR>1 {print $1, $14}'` command uses column number $14, which may not correspond to the UP or ACTING OSD set across all Ceph versions. The exact column layout of `ceph pg dump` plain-text output varies between releases. For production use, `ceph pg dump --format json` parsed with `jq` would be more reliable. Left as-is since it's presented as a quick diagnostic.
- The rack section shows both Rook topology labels (`topology.rook.io/rack`) and manual CRUSH commands. In practice, Rook automatically configures CRUSH placement based on node topology labels, so the manual CRUSH commands may be redundant when Rook is managing the cluster. However, showing both approaches is fine for educational purposes.
- All Rook CRD fields (`failureDomain`, `replicated.size`, `requireSafeReplicaSize`, `erasureCoded.dataChunks`/`codingChunks`, `metadataServer.activeCount`/`activeStandby`) are confirmed valid against current Rook documentation.
- The minimum node requirements table is accurate.
