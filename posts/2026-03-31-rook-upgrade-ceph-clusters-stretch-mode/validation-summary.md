# Validation Summary: How to Upgrade Ceph Clusters in Stretch Mode

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (Reef v18.2.x)
- Ceph Orchestrator (cephadm)
- Ceph Stretch Mode
- Rook

## Sources Consulted
- Ceph Reef documentation for `ceph orch upgrade` command and its `--image`, `--daemon-types`, `--hosts` flags: https://docs.ceph.com/en/reef/cephadm/upgrade/
- Ceph Stretch Mode documentation: https://docs.ceph.com/en/reef/rados/operations/stretch-mode/
- Ceph OSD flags documentation (`noout`, `noscrub`, `nodeep-scrub`): https://docs.ceph.com/en/reef/rados/operations/control/
- Ceph Monitor quorum commands (`ceph mon stat`, `ceph quorum_status`): https://docs.ceph.com/en/reef/rados/operations/monitoring/

## Issues Found
No technical issues found.

## Review Notes
- The `--hosts` flag for `ceph orch upgrade start` was introduced in later Ceph versions and is available in Reef (v18.2.x). Users on older Ceph versions (pre-Pacific) would not have this flag available.
- In Step 3 (Upgrade Site B Monitors), the two upgrade commands and the quorum check are shown in a single code block. Readers should understand that they must wait for the first monitor to rejoin quorum before proceeding to the second — these should not be run as a batch script.
- The post uses v18.2.0 as the target image. Users should substitute the appropriate version for their environment and verify compatibility with their current version before upgrading.
- The post does not mention backing up the monitor store or creating OSD snapshots before the upgrade, which is recommended best practice for production environments.
