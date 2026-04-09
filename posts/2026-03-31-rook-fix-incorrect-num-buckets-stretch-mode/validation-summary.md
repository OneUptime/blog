# Validation Summary: How to Fix INCORRECT_NUM_BUCKETS_STRETCH_MODE Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (stretch mode, CRUSH map, OSD management)
- Rook (CephCluster custom resource for stretch cluster configuration)
- Kubernetes (topology labels for zone-aware scheduling)

## Sources Consulted
- Ceph official documentation on stretch mode: https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Ceph CLI reference for `ceph mon enable_stretch_mode` command syntax
- Ceph CRUSH map management documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Rook documentation on stretch clusters: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/

## Issues Found

### 1. Non-existent `ceph mon disable_stretch_mode` command (Step 4)
**What was wrong:** The post instructed users to run `ceph mon disable_stretch_mode` to disable stretch mode before re-enabling it. This command does not exist in Ceph. Stretch mode is irreversible once enabled and cannot be disabled.
**What was changed:** Rewrote Step 4 to clarify that stretch mode is irreversible. The step now explains that if stretch mode is already enabled, fixing the CRUSH map (Steps 1-3) resolves the warning. The enable command is shown only for first-time setup.

### 2. Incomplete `ceph mon enable_stretch_mode` syntax (Step 4)
**What was wrong:** The command was `ceph mon enable_stretch_mode tiebreaker-mon datacenter`, which is missing the required CRUSH rule argument. The correct syntax is `ceph mon enable_stretch_mode <tiebreaker_mon> <crush_rule> <bucket_type>`.
**What was changed:** Updated to show the correct three-argument syntax with a concrete example: `ceph mon enable_stretch_mode mon.e stretch_rule datacenter`.

### 3. Incorrect command for checking stretch mode status (Step 5)
**What was wrong:** `ceph mon stat | grep stretch` was recommended, but `ceph mon stat` only shows a brief quorum summary and does not include stretch mode information.
**What was changed:** Replaced with `ceph mon dump | grep stretch`, which outputs detailed monitor configuration including stretch mode status.

## Review Notes
- The `ceph osd crush move osd.5 datacenter=datacenter-A host=node-a1` command in Step 3 is syntactically valid but unusual — `ceph osd crush move` is more commonly used for moving buckets (hosts, racks) rather than individual OSDs. The more typical approach is `ceph osd crush set` with a weight parameter, or moving the entire host bucket. This is not technically wrong, so it was left as-is.
- The Rook CephCluster CR YAML configuration for stretch mode is correct and matches the current Rook API structure.
- The CRUSH map export/inspection commands (`getcrushmap`, `crushtool -d`) are correct and standard practice.
