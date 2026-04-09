# Validation Summary: How to Set Pool Flags in Ceph (HASHPSPOOL, NODELETE, NOPGCHANGE, NOSIZECHANGE)

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (pool flags: hashpspool, nodelete, nopgchange, nosizechange, write_fadvise_dontneed)
- Rook (CephBlockPool CRD, rook-ceph-tools)
- Kubernetes (kubectl exec)

## Sources Consulted
- Ceph official documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CLI reference for `ceph osd pool set` and `ceph osd pool get`: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph source code for pool flag definitions (src/osd/osd_types.h)
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found
No technical issues found.

## Review Notes
- All CLI commands use correct Ceph syntax and valid flag names.
- The `hashpspool` default-on-since-Luminous claim is accurate; Luminous (12.x) made this the default for new pools.
- The `nodelete` flag does indeed block pool deletion even when `--yes-i-really-really-mean-it` is provided — this is a hard block at the OSD level.
- The JSON parsing script correctly references `flags_names`, which is the human-readable flags field in `ceph osd dump` output (available in Luminous and later). The use of `.get()` with a default empty string is a safe pattern.
- The CephBlockPool CRD `parameters` section is a valid pass-through mechanism that invokes `ceph osd pool set` under the hood. The advice to prefer CLI for safety flags over CRD is sound operational guidance.
- The `write_fadvise_dontneed` flag is mentioned in the overview table but not elaborated on in its own section. This is acceptable since the post focuses on safety/protection flags.
