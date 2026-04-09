# Validation Summary: How to Enable Overwrites for Erasure Coded Pools (BlueStore Required)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (erasure coded pools, BlueStore OSD backend)
- Rook (CephBlockPool CRD)
- Kubernetes
- RBD (RADOS Block Device)
- Python 3 (for OSD metadata inspection script)

## Sources Consulted
- Ceph official documentation on erasure coded pools and the `allow_ec_overwrites` flag (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Ceph documentation on BlueStore (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph CLI reference for `ceph osd pool set/get` commands (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph RBD documentation on data pools (https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/)
- Rook documentation on CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph `ceph osd metadata` command output format

## Issues Found
No technical issues found.

## Review Notes
- The `ceph osd pool create` commands use explicit PG number syntax (e.g., `32 32`), which is the older style. Modern Ceph clusters (Nautilus+) typically rely on the pg_autoscaler module and may not require explicit PG counts. The syntax is still valid and works correctly, so this is not an error, but readers on newer clusters may want to omit the PG numbers.
- The Rook CephBlockPool YAML defines the EC data pool only. For a complete RBD setup, a separate replicated metadata pool is also needed. The post correctly demonstrates this in the CLI section but doesn't show the full Rook CRD setup for both pools. This is acceptable given the post's focused scope.
- The performance comparison table presents approximate relative numbers rather than benchmarked data. The magnitudes are reasonable and consistent with expected EC overwrite behavior, but readers should benchmark their own workloads.
- The erasure code profile (`ec-profile`) referenced in the `ceph osd pool create` command is assumed to already exist. Readers unfamiliar with EC profiles may need to create one first using `ceph osd erasure-code-profile set`.
