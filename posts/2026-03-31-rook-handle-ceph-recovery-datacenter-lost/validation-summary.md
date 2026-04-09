# Validation Summary: How to Handle Ceph Recovery When Datacenter is Lost

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (stretch clusters, CRUSH maps, OSDs, monitors)
- Rook (CephCluster CRD, stretch cluster configuration)
- RADOS Gateway (RGW) multi-site replication
- RBD mirroring
- Kubernetes (node topology labels)

## Sources Consulted
- Ceph Stretch Mode documentation: https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Ceph Multi-Site RGW documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph RBD Mirroring documentation: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Rook Stretch Cluster documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/
- Rook Stretch Cluster design doc: https://github.com/rook/rook/blob/master/design/ceph/ceph-stretch-cluster.md
- Ceph `rbd` man page: https://github.com/ceph/ceph/blob/main/doc/man/8/rbd.rst

## Issues Found

1. **Incorrect `ceph mon enable_stretch_mode` usage (Stretch Cluster Failover section)**: The post presented `ceph osd set-require-min-compat-client luminous` and `ceph mon enable_stretch_mode mon-a mon-b mon-arbiter datacenter datacenter=A` as failover commands to run after a datacenter failure. Both are wrong: `enable_stretch_mode` is an initial setup command (not a failover action), and its syntax was incorrect — the correct syntax is `ceph mon enable_stretch_mode <tiebreaker_mon> <crush_rule> <dividing_bucket>`. In a properly configured stretch cluster, the cluster automatically enters degraded stretch mode when a datacenter fails. Replaced the block with correct verification commands (`ceph -s`, `ceph mon stat`, `ceph osd tree`).

2. **Useless `ceph osd tree | grep CRUSH` command**: The `ceph osd tree` output does not contain the string "CRUSH", so this grep would produce no output. Removed the separate "Check cluster health" block and consolidated health check commands into the corrected failover block.

3. **Missing `zonegroup modify` step in RGW failover**: The multi-site RGW promotion sequence was missing the critical `radosgw-admin zonegroup modify --rgw-zonegroup=default --master` command. Per Ceph documentation, promoting a secondary zone requires modifying both the zone and the zonegroup to set the `--master` flag before committing the period update. Added the missing command.

4. **Incorrect node name in rebuild section**: The command `ceph osd crush move node-a root=default datacenter=datacenter-b` used `node-a` when reintegrating the lost datacenter-b. Changed to `node-b1` to correctly represent moving a recovered datacenter-b node back into the CRUSH hierarchy.

## Review Notes
- The `ceph mon set_location mon-tiebreaker datacenter=arbiter` command in the first stretch cluster code block is syntactically valid but is an initial setup step rather than a failover action. It was kept since it could serve as a verification/setup reminder in context.
- The `radosgw-admin zone modify` command uses `secondary` as a placeholder zone name. In practice, users should replace this with their actual zone name.
- The Rook CephCluster YAML is correct. The explicit `arbiter: false` on non-arbiter zones is unnecessary (false is the default) but not harmful.
- The post could benefit from mentioning that stretch mode requires `mon_election_strategy` to be set to `connectivity` as a prerequisite, but this is outside the scope of the failover-focused article.
