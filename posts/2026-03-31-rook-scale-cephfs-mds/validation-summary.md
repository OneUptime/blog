# Validation Summary: How to Scale a CephFilesystem MDS Deployment in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server)
- CephFS (Ceph Filesystem)
- Kubernetes (pod scheduling, anti-affinity, resource limits)
- kubectl CLI

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/
- Ceph MDS cache configuration: https://docs.ceph.com/en/latest/cephfs/cache-configuration/
- Rook MDS daemon naming conventions from Rook source and deployment patterns

## Issues Found

1. **Invalid Ceph config option `mds_cache_trim_threshold`**: This is not a valid Ceph configuration parameter. Replaced with `mds_cache_reservation`, which controls the fraction of the cache memory limit kept as a free buffer (default 0.05). Updated the comment to accurately describe its purpose.

2. **Incorrect description of `activeStandby: false`**: The YAML comment stated "false = use standby-replay daemons (lower cost than hot standby)" which is wrong. `activeStandby` controls whether Rook deploys a dedicated standby for each active MDS, not whether standby-replay mode is enabled (standby-replay is a separate Ceph feature). The explanation text also incorrectly described the standbys as "cold standbys that have not preloaded the MDS journal." Fixed to accurately explain that `activeStandby: false` results in `activeCount + 1` pods with a shared standby instead of `activeCount * 2` pods with dedicated standbys.

3. **Incorrect MDS daemon identifier format**: The `ceph tell` commands used `mds.myfs.0` which is not a valid daemon identifier. In Rook-managed Ceph clusters, MDS daemons are named with letter suffixes like `myfs-a`, `myfs-b`. Fixed all occurrences to use `mds.myfs-a`.

## Review Notes
- The mermaid diagram shows standbys as dedicated "hot spares" connected to specific active MDS daemons. While this is how `activeStandby: true` works (dedicated standbys), regular Ceph standbys are not inherently tied to a specific active. The diagram is acceptable for illustrating the `activeStandby: true` configuration.
- The `ceph fs status` example output format is representative but simplified; actual output formatting may vary slightly between Ceph versions.
- The post correctly recommends `podAntiAffinity` for spreading MDS pods, which is important for production HA deployments.
