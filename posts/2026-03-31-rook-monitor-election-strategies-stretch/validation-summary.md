# Validation Summary: How to Configure Monitor Election Strategies for Stretch Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (monitor election strategies, stretch mode)
- Rook (CephCluster CRD configuration)
- Kubernetes (kubectl commands, topology labels)

## Sources Consulted
- Ceph Stretch Mode documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/stretch-mode/
- Ceph Monitor Election Strategy documentation: https://docs.ceph.com/en/reef/rados/operations/change-mon-elections/
- Ceph MonCommands.h source: https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Rook Stretch Cluster documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/

## Issues Found
- **Incomplete `ceph mon enable_stretch_mode` command**: The post had `ceph mon enable_stretch_mode mon.arbiter`, which is missing two required positional parameters. The full syntax is `ceph mon enable_stretch_mode <tiebreaker_mon> <new_crush_rule> <dividing_bucket>`. Fixed to `ceph mon enable_stretch_mode mon.arbiter stretch_rule zone` to include the CRUSH rule name and dividing bucket type.

## Review Notes
- The `ceph mon set election_strategy connectivity` command correctly uses the string name; numeric values (1/2/3) are only used for the `mon election default strategy` config option set before cluster construction.
- The three election strategies (classic, disallow, connectivity) are accurately described.
- The Rook CephCluster CRD snippet for stretch cluster configuration is correct.
- The `ceph mon set_location` command syntax is valid. Official Ceph docs typically show the short monitor name (e.g., `arbiter` rather than `mon.arbiter`), but the full name form works as well since `mon.arbiter` can be the monitor's name.
- The explanation of connectivity scoring and quorum behavior in a 5-monitor (2+2+1) stretch cluster is accurate.
