# Validation Summary: How to Set Up Erasure Coded Pools in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (erasure coded pools, CRUSH rules, OSD management)
- Rook (CephBlockPool CRD for Kubernetes-managed Ceph)
- Kubernetes (kubectl for Rook resource management)
- Jerasure erasure coding plugin (reed_sol_van technique)

## Sources Consulted
- Ceph official documentation on erasure code profiles: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph official documentation on erasure code pool creation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph documentation on EC overwrites: https://docs.ceph.com/en/latest/rados/operations/erasure-code/#erasure-coding-with-overwrites
- Rook documentation on CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph documentation on RBD with erasure coded pools: https://docs.ceph.com/en/latest/rbd/rbd-erasure-code/

## Issues Found
1. **Incorrect terminology for EC pool `min_size` comment (line 74)**: The comment said "Set the minimum number of replicas required for I/O" but EC pools use shards, not replicas. Changed "replicas" to "shards" to accurately reflect EC pool behavior.

2. **Misleading description of RBD on EC pools (line 133)**: The post said RBD images "generally require a replicated data pool." This is misleading because with RBD on EC pools, the EC pool serves as the data pool and a separate replicated pool is needed for metadata (headers, object map, etc.). Changed to "require a separate replicated pool for metadata."

3. **Incorrect comment for `allow_ec_overwrites` command (line 136)**: The comment said "Check if omap is in use (should be avoided on EC pools)" but the command `ceph osd pool get my-ec-pool allow_ec_overwrites` checks the EC overwrites flag, not omap usage. Changed to "Check if EC overwrites are enabled (required for RBD and CephFS data pools)" to match what the command actually does.

## Review Notes
- The Rook CephBlockPool CRD example is correct but does not mention that RBD on EC pools also requires a replicated metadata pool to be configured. In practice, Rook handles some of this automatically, but users should be aware of this requirement.
- All Ceph CLI commands use correct syntax and valid flags.
- The erasure coding overhead formula and examples are mathematically correct.
- The jerasure plugin with reed_sol_van technique is a valid and common configuration.
- The `fast_read` pool parameter is correctly described as reading from all shards simultaneously.
