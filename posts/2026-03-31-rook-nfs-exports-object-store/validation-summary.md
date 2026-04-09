# Validation Summary: How to Configure NFS Exports Backed by Object Store in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph NFS-Ganesha (FSAL_RGW)
- Ceph Object Store (RADOS Gateway / RGW)
- Kubernetes
- NFSv4

## Sources Consulted
- Ceph official documentation on NFS exports (`doc/mgr/nfs.rst`) - `ceph nfs export create rgw` CLI reference
- Ceph source code (`src/pybind/mgr/nfs/export.py`) - export JSON structure and field names
- NFS-Ganesha FSAL_RGW source code (`src/FSAL/FSAL_RGW/main.c`) - capability flags (link_support, lock_support, etc.)
- Rook official documentation - CephNFS CRD (https://rook.io/docs/rook/latest/CRDs/ceph-nfs-crd/)
- Rook official documentation - CephObjectStore CRD (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- Rook official documentation - Toolbox (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- Ceph PR #43075 - backport of `ceph nfs export create rgw` to Pacific

## Issues Found

1. **Incorrect flag name `--pseudo`**: The `ceph nfs export create rgw` command used `--pseudo /s3export`, but the correct flag name is `--pseudo-path`. Fixed to `--pseudo-path /s3export`.

2. **Incorrect FSAL field name `rgw_user`**: The example JSON output from `ceph nfs export info` showed `"rgw_user"` in the FSAL block, but the actual field name in Ceph's export output is `"user_id"`. Fixed to `"user_id": "nfs.my-nfs.2"`.

## Review Notes
- The `proto=tcp` and `port=2049` mount options are technically redundant for NFSv4 (TCP is mandatory and 2049 is the default port), but specifying them explicitly is not incorrect and can improve clarity.
- Rook does not provide native CRD-level support for RGW-backed NFS exports (only CephFS-backed exports have declarative CRD support). The manual CLI approach shown in this post via the toolbox is the correct way to set up RGW exports in a Rook environment.
- The `ceph nfs export create rgw` command was introduced in Ceph Pacific (v16.2.x) and is fully stable as of Ceph Quincy (v17.2.x). The post does not specify a Ceph version, which is acceptable since the command is current.
- All four stated limitations (no hard links, slow directory listing, approximate POSIX semantics, no concurrent write handling) are confirmed by the NFS-Ganesha FSAL_RGW source code and Ceph documentation.
