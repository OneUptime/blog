# Validation Summary: How to Enable Fast Read for Erasure Coded Pools in Ceph

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ceph (erasure coded pools, `fast_read` pool parameter)
- Rook (CephBlockPool CRD for Kubernetes-managed Ceph)
- Kubernetes (kubectl exec for toolbox access)
- RADOS bench (performance benchmarking)
- Jerasure erasure code plugin

## Sources Consulted
- Ceph official documentation — Pools: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation — Erasure Code: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph official documentation — Erasure Code Profiles: https://docs.ceph.com/en/reef/rados/operations/erasure-code-profile/
- Ceph official documentation — Jerasure plugin: https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/
- Ceph official documentation — rados man page: https://docs.ceph.com/en/latest/man/8/rados/
- Rook documentation — CephBlockPool CRD: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook GitHub — pool-ec.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/pool-ec.yaml

## Issues Found
No technical issues found.

## Review Notes
- The description of `fast_read` behavior ("sends requests to all available shards simultaneously and uses whichever k shards respond first") is a faithful simplification. The official Ceph docs note that the "use first K responses immediately" optimization applies specifically to the jerasure or ISA erasure plugins. Since jerasure is the default plugin (and the sample profile output in the post shows `plugin=jerasure`), this omission is reasonable for the target audience.
- All CLI commands (`ceph osd pool set/get`, `ceph osd erasure-code-profile ls/get`, `rados bench`) use correct syntax and valid flags.
- The Rook CephBlockPool CRD YAML is valid: `erasureCoded` with `dataChunks`/`codingChunks` is the correct spec, and the `parameters` field accepts arbitrary Ceph pool parameters including `fast_read`.
- The `fast_read: "1"` string value in the Rook parameters field is correct — Ceph boolean pool parameters accept `"1"`/`"0"` as well as `"true"`/`"false"`.
- The sample erasure code profile output is realistic and consistent with a custom k=4, m=2 profile using the default jerasure plugin with reed_sol_van technique.
