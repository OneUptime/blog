# Validation Summary: How to Check safe-to-destroy Status for OSDs in Ceph

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph (OSD management, cluster administration)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands, deployment scaling)

## Sources Consulted
- Ceph official man page for `ceph(8)`: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph "Adding/Removing OSDs" operations guide: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph source code (DaemonServer.cc) for safe-to-destroy output message verification
- Rook documentation for toolbox usage

## Issues Found

1. **Fabricated error output message**: The failure output shown as `OSD(s) 5 are not safe to destroy: at least 1 PG would have insufficient copies` is not an actual Ceph output string. Replaced with the real error format: `Error EBUSY: OSD(s) 5 have 24 pgs currently mapped to them`.

2. **Inaccurate `min_size` claim**: The post stated that an OSD is unsafe to destroy when "removing it would reduce the number of copies of some PGs below `min_size`". The actual `safe-to-destroy` implementation checks whether the OSD still has PGs mapped to it and whether it still stores PG data — it does not explicitly check against `min_size`. Updated the three conditions to accurately reflect the actual checks performed.

3. **Missing OSD stop step in pre-removal workflow**: The workflow jumped directly from `safe-to-destroy` to `ceph osd destroy` without stopping the OSD daemon first. Added a step to scale down the OSD deployment in Rook (`kubectl scale deploy rook-ceph-osd-5 --replicas=0`).

4. **Used `ceph osd destroy` instead of `ceph osd purge`**: The workflow used `ceph osd destroy` which only marks the OSD as destroyed but does not remove it from the CRUSH map or OSD map. Replaced with `ceph osd purge` which performs a complete removal (destroy + crush remove + auth delete), which is the appropriate command for permanent decommissioning.

5. **Used `watch ceph status` instead of `ceph -w`**: Replaced `watch ceph status` (depends on the external `watch` binary) with `ceph -w` (Ceph's built-in watch mode), which is more reliable in container environments and more idiomatic.

## Review Notes
- The success output message `OSD(s) 5 are safe to destroy without reducing data durability.` is accurate and matches actual Ceph output.
- The distinction between `safe-to-destroy` (permanent removal) and `ok-to-stop` (temporary maintenance) is correctly described.
- The `ceph osd ok-to-stop` command syntax and description are accurate.
- In a Rook-managed cluster, the OSD removal process may also involve editing the CephCluster CR or using Rook's built-in OSD removal mechanisms rather than manual `ceph osd purge` commands. The blog's approach of using the toolbox for manual operations is valid but users should be aware of Rook's higher-level abstractions.
