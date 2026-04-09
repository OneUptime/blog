# Validation Summary: How to Monitor OSD Status and Operational States in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (Object Storage Daemon monitoring and state management)
- Rook (Kubernetes operator for Ceph)
- Kubernetes (kubectl commands for pod inspection)
- Python 3 (inline JSON parsing script)

## Sources Consulted
- Ceph official documentation on OSD states and the `up`/`down`, `in`/`out` state model: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph documentation on CRUSH weight vs reweight: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph CLI reference for `ceph osd stat`, `ceph osd dump`, `ceph osd df`: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph documentation on `mon_osd_down_out_interval` and automatic OSD-out behavior: https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/
- Rook documentation on OSD pod labels and management: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Other blog posts in this repository covering OSD reweight and CRUSH weight calculations for consistency

## Issues Found

### 1. Incorrect reference to CRUSH weight in in/out state description
- **What was wrong:** The OSD state table described `in` as "has CRUSH weight > 0" and `out` as "CRUSH weight = 0". The in/out state actually controls the OSD's *reweight* (a 0–1 multiplier), not its CRUSH weight. CRUSH weight reflects the device's capacity (typically in TiB) and does not change when an OSD is marked in or out.
- **What was changed:** Replaced "CRUSH weight" with "reweight" in both table rows.
- **Why:** Conflating CRUSH weight and reweight can mislead readers into using `ceph osd crush reweight` when they should use `ceph osd in/out` or `ceph osd reweight`. Other posts in this blog correctly distinguish these two concepts.

### 2. Inaccurate recovery behavior for `down + in` state
- **What was wrong:** The post stated that when an OSD is `down + in`, "Ceph is recovering data." In reality, Ceph does not begin recovery/backfill while an OSD is `down + in`. It waits for `mon_osd_down_out_interval` (default 600 seconds) before automatically marking the OSD `out`, which triggers recovery.
- **What was changed:** Changed "Ceph is recovering data" to "data has fewer copies, recovery starts after timeout."
- **Why:** This distinction matters operationally — administrators should know that data is degraded but not actively recovering during this window, and that brief OSD restarts won't trigger unnecessary data movement.

### 3. Incorrect sort column number for `ceph osd df` output
- **What was wrong:** The command `sort -k10 -n -r` was used to sort `ceph osd df` output by usage. However, given the blog's own sample output (which uses human-readable units like "280 GiB", "2 TiB"), each size column produces two whitespace-delimited fields (value + unit). Field 10 corresponds to the unit label after the DATA column ("GiB"), not `%USE`.
- **What was changed:** Changed `-k10` to `-k17`, which corresponds to the `%USE` field in the sample output format shown in the post.
- **Why:** Sorting by the wrong column would produce misleading results. Note that the exact column number depends on the Ceph version and output format; `-k17` matches the sample output provided in this post.

## Review Notes
- The `sort` command for `ceph osd df` output is inherently fragile because human-readable units split size columns into two whitespace-delimited fields. A more robust alternative would be to use `ceph osd df --format json` with `jq` for sorting, but that would be a larger change to the post's approach.
- The section "Set OSD Down and Out for Maintenance" only demonstrates marking an OSD `out` (`ceph osd out`), not explicitly stopping it (`down`). The title is slightly misleading but the command itself is correct — marking `out` is the standard first step before maintenance.
- The Python inline script for parsing `ceph osd dump --format json` runs locally (not inside the container) due to the shell pipe. This requires Python 3 on the local machine, which is a reasonable assumption but worth noting.
- All `kubectl exec` commands correctly target `deploy/rook-ceph-tools` in the `rook-ceph` namespace, which is the standard Rook toolbox deployment.
- The Kubernetes label selectors (`app=rook-ceph-osd` and `ceph_daemon_id=0`) are correct for Rook-managed OSD pods.
