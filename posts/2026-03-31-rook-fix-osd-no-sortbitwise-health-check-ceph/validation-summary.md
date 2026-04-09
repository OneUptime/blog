# Validation Summary: How to Fix OSD_NO_SORTBITWISE Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (Jewel 10.x, Luminous 12.x, and later)
- Rook (Ceph operator for Kubernetes)
- RADOS (Reliable Autonomic Distributed Object Store)
- Kubernetes (kubectl for Rook toolbox access)

## Sources Consulted
- Ceph official documentation on OSD map flags and health checks (https://docs.ceph.com/en/latest/rados/operations/health-checks/#osd-no-sortbitwise)
- Ceph Jewel (10.2.x) release notes regarding the sortbitwise flag introduction
- Ceph Luminous (12.x) upgrade documentation on required OSD flags
- Rook documentation on toolbox pod usage for Ceph cluster management (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found
- **"Checking for Side Effects" section contained an inaccurate claim about object reordering.** The post stated "Ceph may need to reorder objects in some PGs" and "Object reordering happens automatically and should complete quickly on modern clusters." This is incorrect. Setting the `sortbitwise` flag changes the comparison function used for object enumeration in future operations (scrubbing, listing) but does not trigger any physical data movement or PG state changes. Objects remain on disk as they are. Fixed the section to accurately describe the immediate, non-disruptive nature of the flag change and note that the health warning should clear within seconds as monitors pick up the updated OSD map.

## Review Notes
- The `ceph versions` command referenced in the "Checking OSD Versions" section was introduced in Luminous (12.x), not Jewel. However, since the health check output format shown (`[WRN] OSD_NO_SORTBITWISE`) is the Luminous+ format, users encountering this warning would be on Luminous+ where `ceph versions` is available. No change needed.
- The example output `flags sortbitwise` is simplified; real clusters typically show additional flags (e.g., `recovery_deletes`, `purged_snapdirs`). This is acceptable for illustration purposes.
- On Luminous+ clusters, the `require_jewel_osds` flag prevents unsetting `sortbitwise`, making the regression scenario described in "Preventing Regression" effectively impossible on properly configured modern clusters. The advice to never unset it is still correct and appropriate.
