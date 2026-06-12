# Validation Summary: How to Build Ceph Pool Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ceph RADOS pools
- Ceph OSD pool CLI commands
- Placement groups and PG autoscaling
- Erasure coding
- CRUSH rules and device classes
- Pool quotas, snapshots, and BlueStore compression
- CephFS, RBD, and RGW pool application labels

## Sources Consulted
- Ceph Documentation: Pools - https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Documentation: Erasure Code - https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph Documentation: Placement Groups and PG Autoscaling - https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Ceph Documentation: CRUSH Maps - https://docs.ceph.com/en/reef/rados/operations/crush-map/
- Ceph Documentation: BlueStore Inline Compression - https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/#inline-compression
- Ceph Administration Tool Manual - https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph RADOS Utility Manual - https://docs.ceph.com/en/latest/man/8/rados/

## Issues Found
- The replicated pool example said a size of 3 "provides tolerance for 2 simultaneous OSD failures" without clarifying availability. Updated the comment to distinguish data-loss protection from continued I/O, which is governed by `min_size`.
- The `min_size` comment described write failure only. Updated it to refer to I/O availability more generally.
- The placement group section gave a fixed "100-200 PGs per OSD" recommendation. Updated the wording to account for modern PG autoscaler and balancer guidance, where recommended targets depend on release, balancer settings, and cluster size.
- The erasure-coded pool example incorrectly stated that EC pools require `k+m` PGs minimum. Updated the note to say EC pools require enough OSDs or failure-domain buckets for `k+m` shards.
- The pool snapshot listing example used `ceph osd pool lssnap`, which is not documented in the current `ceph` command reference. Updated it to the documented `rados -p mypool lssnap` command.
- The compression mode descriptions overstated `aggressive` and `force`. Updated them to match Ceph BlueStore behavior: `aggressive` respects incompressible client hints, while `force` tries to compress regardless of hints.

## Review Notes
The Ceph CLI command forms used for pool creation, pool application labels, quotas, snapshots, CRUSH rules, autoscale status, and pool stats now match current Ceph documentation. The RGW pool shown in the complete example is only an example data pool; a full RGW deployment normally uses multiple service and data pools.
