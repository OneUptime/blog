# Validation Summary: How to Specify CRUSH Location (Root, Datacenter, Room, Row, Rack, Chassis, Host)

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (CRUSH map, OSD placement, PG mapping)
- Rook (Kubernetes-based Ceph operator)
- Kubernetes (node labels for topology)

## Sources Consulted
- Ceph official documentation on CRUSH maps (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation on CRUSH map editing (https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/)
- Ceph MonCommands source for CLI command signatures
- Rook CephCluster CRD documentation for topology label specifications (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph man pages for `ceph osd`, `ceph pg` subcommands

## Issues Found
1. **CRUSH location pair ordering claim (line 15)**: The post stated the format uses pairs "from most specific (osd) to least specific (root)." This was incorrect in two ways: the order of key-value pairs does not matter to Ceph, and "osd" is not a bucket type used in `crush_location`. Changed to: "the order of pairs does not matter."

2. **`ceph osd find` syntax (lines 28, 34)**: The post used `ceph osd find osd.0` but the canonical syntax takes a numeric OSD ID: `ceph osd find 0`. Changed both the command and the example output reference to use the numeric form.

3. **`ceph pg dump` awk column (line 118)**: The post used `ceph pg dump | awk '{print $1, $14}' | head -20` claiming column `$14` shows PG distribution across OSDs. The column layout of `ceph pg dump` is version-dependent and undocumented, making `$14` unreliable. Replaced with `ceph pg dump pgs_brief`, which outputs a stable, concise format showing PG ID, state, up set, and acting set.

## Review Notes
- All other commands (`ceph osd tree`, `ceph osd crush dump`, `ceph osd crush set`, `ceph osd crush add-bucket`, `ceph osd crush move`, `ceph osd map`, `ceph pg map`) are syntactically correct and match official documentation.
- The `crush_location` config option name (with underscore) is confirmed correct per official Ceph docs.
- Rook topology labels (`topology.kubernetes.io/zone`, `topology.rook.io/rack`, `topology.rook.io/datacenter`) are all confirmed correct per Rook CRD documentation.
- The CRUSH weight description ("typically the OSD size in terabytes") is accurate per official docs.
