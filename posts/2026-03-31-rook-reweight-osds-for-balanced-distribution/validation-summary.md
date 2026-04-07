# Validation Summary: How to Reweight OSDs for Balanced Data Distribution in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Ceph OSD reweight and CRUSH weight mechanisms
- kubectl CLI

## Sources Consulted
- Ceph official documentation: OSD management commands (https://docs.ceph.com/en/latest/rados/operations/control/)
- Ceph official documentation: CRUSH map manipulation (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: `ceph osd reweight-by-utilization` (https://docs.ceph.com/en/latest/man/8/ceph/#osd)
- Rook documentation: Ceph toolbox usage (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found
No technical issues found.

## Review Notes
- All commands use correct syntax: `ceph osd reweight <id> <weight>` (0.0-1.0 range), `ceph osd crush reweight osd.<id> <weight>`, `ceph osd reweight-by-utilization [threshold]`, and `ceph osd test-reweight-by-utilization`.
- The distinction between CRUSH weight (target distribution in the CRUSH map, typically matching disk capacity in TB) and OSD reweight (a secondary 0.0-1.0 multiplier) is correctly explained.
- The default threshold for `reweight-by-utilization` is correctly stated as 120 (20% above average), and the example of passing 115 (15% above average) is accurate.
- The `ceph osd df` command correctly shows WEIGHT, REWEIGHT, and VAR columns as described.
- The recommendation to set `noout` during reweight operations is a valid best practice. The explanation is slightly simplified — `noout` specifically prevents OSDs from being marked `out` if they go `down`, rather than preventing "false failure detection" per se — but the practical advice is sound and appropriate for a tutorial audience.
