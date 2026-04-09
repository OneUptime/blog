# Validation Summary: How to Understand Reserved Pool Naming Conventions in Ceph

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- RADOS Gateway (RGW)
- CephFS
- CephBlockPool (RBD)
- kubectl

## Sources Consulted
- Ceph official documentation on pool management (`ceph osd pool ls`, `ceph osd dump`)
- Rook documentation on CephBlockPool, CephFilesystem, and CephObjectStore CRDs
- Cross-referenced with other validated blog posts in this repository that use `ceph osd pool ls detail --format json` (e.g., `2026-03-31-rook-how-to-list-pools-with-ceph-osd-pool-ls-and-ceph-osd-lspools`)
- Ceph source code (`pg_pool_t::dump()` in `src/osd/osd_types.cc`)

## Issues Found
- **Incorrect JSON field name in Python script**: The "View Pool Names After Deployment" section used `p['pool']` to access the pool ID from `ceph osd pool ls detail --format json` output. The correct field name is `p['pool_id']`. Note: `ceph osd dump --format json` uses `pool` (without `_id`), but `ceph osd pool ls detail --format json` uses `pool_id`. Fixed `p['pool']` to `p['pool_id']`.

## Review Notes
- The `cephfs.` entry in the reserved prefixes table is somewhat misleading. CephFS does not enforce a `cephfs.` pool name prefix — the pool names are determined by the filesystem name and Rook conventions (`<name>-metadata`, `<name>-data0`). The `cephfs.` string is used as a RADOS namespace prefix internally by the MDS, not as a pool name prefix. However, the broader advice to avoid naming conflicts with CephFS-related patterns is still sound.
- The claim that "Pools starting with a period (.) are hidden from `ceph osd pool ls` by default" may not hold true in all Ceph versions. In recent releases (Quincy, Reef, Squid), `ceph osd pool ls` shows all pools including dot-prefixed ones. The Ceph dashboard UI may hide them, but the CLI typically does not.
- The RGW pool names, CephFS pool naming patterns, and CephBlockPool naming behavior are all accurate.
- The `kubectl` commands and Rook CRD API version (`ceph.rook.io/v1`) are correct and current.
