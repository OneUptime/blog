# Validation Summary: How to Fix Stuck PGs (Degraded, Stale, Unclean) in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)
- Ceph Placement Groups (PGs) and OSD management

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on `pg dump_stuck`: https://docs.ceph.com/en/latest/rados/operations/monitoring/#stuck-placement-groups
- Ceph official documentation on OSD flags: https://docs.ceph.com/en/latest/rados/operations/control/#osd-subsystem
- Ceph official documentation on scrubbing: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#scrubbing
- Rook documentation on toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
No technical issues found.

## Review Notes
- All five stuck PG states (`inactive`, `unclean`, `stale`, `degraded`, `undersized`) are correctly described and match the Ceph documentation.
- All `ceph pg` and `ceph osd` commands use correct syntax and valid flags.
- The Rook toolbox deployment path (`deploy/rook-ceph-tools`) and OSD pod label (`app=rook-ceph-osd`) are correct for current Rook versions.
- The `ceph pg dump_stuck` command remains valid in current Ceph releases (Pacific, Quincy, Reef).
- The troubleshooting workflow (identify stuck PGs, diagnose, check for blocking flags, force scrub) follows Ceph best practices.
