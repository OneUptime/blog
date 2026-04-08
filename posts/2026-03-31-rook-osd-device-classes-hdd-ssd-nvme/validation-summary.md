# Validation Summary: How to Manage OSD Device Classes (HDD, SSD, NVMe) in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph
- CRUSH
- OSD device classes
- Erasure-coded pools
- Rook
- Kubernetes

## Sources Consulted
- Ceph documentation, "CRUSH Maps" (device classes): https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes
- Ceph documentation, "Pools": https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph documentation, "Erasure Code": https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph monitor command API (`osd metadata`, `osd crush rule ls`, `osd crush rule list`, `osd crush rule dump`): https://docs.ceph.com/en/tentacle/api/mon_command_api/
- Rook documentation, "CephBlockPool CRD": https://www.rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found
- The post used `ceph osd metadata 0 | grep rotational`. I changed it to `ceph osd metadata osd.0 | grep rotational` because the documented OSD metadata command targets OSDs in the `osd.N` form.
- The post used `ceph osd crush rule list` as the verification command. I changed it to `ceph osd crush rule ls` because `list` is currently documented as deprecated, while `ls` is the current command.

## Review Notes
- The Ceph device-class workflow described in the post is otherwise technically correct: automatic class detection, manual reassignment with `rm-device-class` followed by `set-device-class`, class-aware replicated CRUSH rules, pool rule assignment, and erasure-code profile usage all match current documentation.
- The Rook `CephBlockPool.spec.deviceClass` field is current and valid. Current Rook docs also note that if `deviceClass` is specified on any pool, it should be specified consistently across pools in the cluster to avoid overlapping-root warnings and possible balancer/autoscaler confusion.
