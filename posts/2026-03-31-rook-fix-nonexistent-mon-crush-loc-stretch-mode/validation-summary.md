# Validation Summary: How to Fix NONEXISTENT_MON_CRUSH_LOC_STRETCH_MODE Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (stretch mode, CRUSH maps, monitor configuration)
- Rook (CephCluster CRD stretch cluster configuration)
- CRUSH hierarchy management

## Sources Consulted
- [Stretch Clusters — Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/stretch-mode/)
- [Stretch Mode RST source — Ceph Reef](https://docs.ceph.com/en/reef/_sources/rados/operations/stretch-mode.rst.txt)
- [MON Service — Ceph Documentation (Quincy)](https://docs.ceph.com/en/quincy/cephadm/services/mon/)
- [MonCommands.h — Ceph source](https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h)
- [Stretch Storage Cluster — Rook Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/)
- [CephCluster CRD — Rook Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- [Rook stretch cluster design doc](https://github.com/rook/rook/blob/master/design/ceph/ceph-stretch-cluster.md)
- [Rook cluster-stretched.yaml example](https://github.com/rook/rook/blob/master/deploy/examples/cluster-stretched.yaml)

## Issues Found
- **Incorrect command name for setting monitor CRUSH location (2 occurrences):** The post used `ceph mon set-crush-location mon.b` which is not a valid Ceph command. The correct command is `ceph mon set_location <mon_id>` where `<mon_id>` is the short monitor name (e.g., `b`, not `mon.b`). Fixed both occurrences:
  - Step 3 (Option B): Changed `ceph mon set-crush-location mon.b datacenter=datacenter-B` to `ceph mon set_location b datacenter=datacenter-B`
  - Step 4 (Option C): Changed `ceph mon set-crush-location mon.b datacenter=tiebreaker` to `ceph mon set_location b datacenter=tiebreaker`

## Review Notes
- The health check name `NONEXISTENT_MON_CRUSH_LOC_STRETCH_MODE` is correct per Ceph source code.
- All other CLI commands (`ceph health detail`, `ceph mon dump`, `ceph osd crush tree --show-shadow`, `ceph osd crush ls`, `ceph osd crush add-bucket`, `ceph osd crush move`) are valid.
- The Rook CRD stretch cluster YAML with `spec.mon.stretchCluster.zones` including `name` and `arbiter` fields is accurate per Rook documentation.
- The `--set-crush-location` flag referenced in Ceph docs is a daemon boot-time option (e.g., `ceph-mon --set-crush-location 'datacenter=a'`), which is distinct from the runtime `ceph mon set_location` command. The blog post's original `set-crush-location` may have been a conflation of these two.
