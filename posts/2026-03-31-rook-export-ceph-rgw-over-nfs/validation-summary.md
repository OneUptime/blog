# Validation Summary: How to Export Ceph RGW Over NFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- NFS-Ganesha with FSAL_RGW plugin
- Rook Ceph Operator (CephNFS CRD)
- NFS v4
- RADOS

## Sources Consulted
- ganesha-rgw-config(8) man page — https://www.mankier.com/8/ganesha-rgw-config
- NFS-Ganesha FSAL_RGW source code (main.c) — https://github.com/nfs-ganesha/nfs-ganesha/blob/next/src/FSAL/FSAL_RGW/main.c
- NFS-Ganesha Configuration Wiki — https://github.com/nfs-ganesha/nfs-ganesha/wiki/Configurationfile
- NFS-Ganesha sample RGW configs — https://github.com/nfs-ganesha/nfs-ganesha/tree/next/src/config_samples
- Rook CephNFS CRD specification — https://rook.io/docs/rook/latest/CRDs/specification/
- Rook PR #8501 (rados deprecation) — https://github.com/rook/rook/pull/8501
- radosgw-admin CLI documentation — https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found

1. **Top-level `FSAL` block should be `RGW`**: In NFS-Ganesha, each FSAL module registers its own top-level configuration block using the module name. For FSAL_RGW, the correct top-level block is `RGW { ... }`, not `FSAL { ... }`. The `FSAL` keyword is only valid as a sub-block inside `EXPORT` blocks. Changed `FSAL {` to `RGW {` at the top level.

2. **Duplicate `name` field in top-level block**: The original config had `name = RGW;` (which belongs only in EXPORT FSAL sub-blocks) followed by `name = "rgw.ganesha";` in the same block. Removed the erroneous `name = RGW;` line and corrected the instance name to `name = "client.rgw.ganesha";` following Ceph client naming conventions.

3. **Invalid `rgw_name` parameter in EXPORT FSAL sub-block**: `rgw_name` is not a valid parameter for the FSAL_RGW export configuration. The valid parameters are `name`, `user_id`, `access_key_id`, and `secret_access_key`. The RGW instance name is configured in the top-level `RGW` block, not per-export. Removed the `rgw_name` line.

4. **Invalid `bucket` parameter in EXPORT FSAL sub-block**: `bucket` is not a valid FSAL_RGW export parameter. Bucket selection is controlled via the `Path` directive in the `EXPORT` block itself (already correctly set to `/mybucket`). Removed the `bucket` line.

5. **Deprecated `spec.rados` in CephNFS CRD**: The `spec.rados` section (with `pool` and `namespace`) was deprecated in Rook v1.8 (PR #8501, October 2021). Since Ceph Pacific (v16.2.6+), the NFS RADOS pool is hardcoded to `.nfs` and the namespace is set to the CephNFS resource name. User-specified values are ignored. Additionally, the pool value `rook-ceph-nfs` was incorrect — it was always `.nfs` for Ceph Pacific+. Removed the entire `spec.rados` section.

## Review Notes
- The `showmount -e localhost` command is included to verify exports. While `showmount` queries the NFSv3 mountd protocol and the individual exports are configured with `Protocols = 4` (NFSv4 only), the core config enables `NFS_Protocols = 3,4;` so the mountd service runs. However, NFSv4-only exports may not appear in `showmount` output. Users should also verify via `nfs4_getfacl` or direct NFSv4 mount if `showmount` returns empty results.
- The Rook CephNFS CRD section title "Rook: Ceph NFS CRD for RGW Exports" could be slightly misleading — the CephNFS CRD deploys NFS-Ganesha instances that can serve both CephFS and RGW, but additional manual NFS export configuration is needed for RGW exports beyond just applying the CRD. The body text is accurate in its description.
- NFS-Ganesha config parameter names are case-insensitive, so the lowercase style used in the post (e.g., `user_id` vs `User_Id`) is valid.
