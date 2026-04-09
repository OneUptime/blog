# Validation Summary: How to Use the MDS Autoscaler Module in Ceph Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage platform)
- Ceph Manager (mgr) modules
- MDS Autoscaler module (`mds_autoscaler`)
- CephFS (Ceph File System)
- MDS (Metadata Server) daemons
- Rook (Kubernetes operator for Ceph)
- CephFilesystem custom resource (Rook)

## Sources Consulted
- Official Ceph documentation for mds_autoscaler module: https://docs.ceph.com/en/latest/mgr/mds_autoscaler/
- IBM Storage Ceph documentation on mds_autoscaler: https://www.ibm.com/docs/en/storage-ceph/6?topic=systems-using-mds-autoscaler-module
- Ceph Pacific release blog post (module introduction): https://ceph.io/en/news/blog/2021/new-in-pacific-cephfs-updates/
- Ceph mds_autoscaler module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/mds_autoscaler/module.py
- Original PR introducing the module: https://github.com/ceph/ceph/pull/32731
- Rook CephFilesystem operator source code (MDS reconciliation logic)
- Ceph CephFS administration documentation (max_mds, standby_count_wanted settings)

## Issues Found

### 1. Fundamental mischaracterization of the module's purpose (Critical)
**What was wrong:** The post described the mds_autoscaler as a workload-responsive autoscaler that monitors CPU utilization, client connections, and memory pressure on MDS daemons, then autonomously scales MDS ranks up or down based on load. This is entirely incorrect.
**What was changed:** Rewrote the introduction and "How It Works" section to accurately describe the module. The mds_autoscaler monitors the CephFS file system map (FSMap) for changes to `max_mds` and `standby_count_wanted`, then updates the orchestrator's (e.g., cephadm) MDS service placement specification to ensure the correct total number of MDS daemons are deployed. It does not monitor any performance metrics or make autonomous scaling decisions.
**Why:** The module's source code (`module.py`) clearly shows it subscribes only to `NotifyType.fs_map` notifications and calculates `want = max_mds + standbys_required` to adjust orchestrator placement. No performance metrics are involved.

### 2. Fabricated `min_mds` parameter (Major)
**What was wrong:** The post included the command `ceph fs set cephfs min_mds 1`, but `min_mds` is not a valid `ceph fs set` parameter. It does not exist in any Ceph documentation or source code.
**What was changed:** Replaced `min_mds` with `standby_count_wanted`, which is the actual parameter for configuring the desired number of standby MDS daemons. Updated the section heading from "Setting Autoscaler Bounds" to "Configuring MDS Counts" to reflect that these are not autoscaler bounds but direct configuration inputs.
**Why:** The real parameters the autoscaler reads are `max_mds` and `standby_count_wanted`.

### 3. Incorrect "Manual Override" framing (Moderate)
**What was wrong:** The post framed setting `max_mds` as a "manual override" that constrains the autoscaler from scaling above that value. This implies the autoscaler independently tries to change `max_mds`, which it does not. Setting `max_mds` is the *input* to the autoscaler, not an override of it.
**What was changed:** Renamed the section to "Changing Active MDS Ranks" and reworded to accurately describe that changing `max_mds` triggers the autoscaler to adjust daemon deployment, rather than constraining it.

### 4. Incorrect Rook integration claim (Moderate)
**What was wrong:** The post claimed "The autoscaler can still increase this dynamically beyond the initial value" regarding Rook's `activeCount` field. This is false on two counts: the autoscaler never changes `max_mds`, and the Rook operator enforces `activeCount` as `max_mds` during reconciliation, overriding any external changes.
**What was changed:** Replaced the incorrect claim with an accurate note that Rook enforces `activeCount` as `max_mds` during its reconciliation loop and that external changes to `max_mds` will be overridden.

### 5. Misleading log viewing command (Minor)
**What was wrong:** The command `ceph log last 20 | grep mds_autoscaler` suggests autoscaler decisions appear in the cluster log. While the command syntax is valid, the autoscaler's activity is primarily logged in the manager daemon logs, and since it doesn't make workload-based decisions, there are rarely interesting "decisions" to grep for.
**What was changed:** Changed the command to `ceph tell mgr. log recent | grep mds_autoscaler` to point at the manager daemon logs where module activity is more likely to appear.

### 6. Inaccurate description metadata
**What was wrong:** The Description field said "automatically adjust the number of active MDS daemons based on file system workload."
**What was changed:** Updated to "automatically manage MDS daemon deployment through the orchestrator based on file system configuration."

## Review Notes
- The mds_autoscaler module was introduced in Ceph Pacific (v16.x) via PR #32731, merged August 2020. The module name and enable command are correct.
- The `ceph fs status` output example and the Rook CephFilesystem CR YAML structure are correctly formatted and use valid field names.
- The `watch -n 5 "ceph fs status cephfs"` command is correct and useful.
- Readers looking for actual workload-based MDS autoscaling in Ceph may be disappointed — as of current Ceph releases, no built-in module provides this capability. The mds_autoscaler is strictly a deployment automation tool.
