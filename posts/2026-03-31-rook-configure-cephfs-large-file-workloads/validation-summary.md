# Validation Summary: How to Configure CephFS for Large File Workloads

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph / CephFS
- CephFS file layouts and striping
- Erasure coding
- Ceph OSD tuning
- Kubernetes StorageClass
- fio benchmarking

## Sources Consulted
- [CephFS File Layouts — Ceph Documentation](https://docs.ceph.com/en/latest/cephfs/file-layouts/) (via GitHub source at [ceph/ceph](https://github.com/ceph/ceph/blob/main/doc/cephfs/file-layouts.rst))
- [CephFS Administrative Commands — Ceph Documentation](https://docs.ceph.com/en/latest/cephfs/administration/)
- [CephBlockPool CRD — Rook Documentation](https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/) — confirmed `deviceClass` is a pool-level field
- [CephFilesystem CRD — Rook Documentation](https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- [Rook CRD Specification](https://rook.io/docs/rook/latest/CRDs/specification/)
- [Client Configuration — Ceph Documentation](https://docs.ceph.com/en/reef/cephfs/client-config-ref/) — confirmed `client_readahead_max_bytes` and `client_readahead_min` are valid options
- [OSD Config Reference — Ceph Documentation](https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/) — confirmed `osd_op_num_threads_per_shard` is valid
- [Ceph Command Line API](https://ceph-command-api.readthedocs.io/en/latest/mon_command_api.html)

## Issues Found

### 1. Invalid `ceph fs set` striping parameters
**What was wrong:** The post used `ceph fs set cephfs default_stripe_unit 4194304` and `ceph fs set cephfs default_stripe_count 8` to set filesystem-wide striping defaults. `default_stripe_unit` and `default_stripe_count` are NOT valid parameters for the `ceph fs set` command. The valid parameters for `ceph fs set` include `max_mds`, `max_file_size`, `allow_new_snaps`, `inline_data`, etc. — but not layout/striping settings.

**What was changed:** Replaced the invalid `ceph fs set` commands with the correct approach: using `setfattr` to set extended attributes on the root directory (`/mnt/cephfs/`) to configure filesystem-wide default layouts. Updated the surrounding text to clarify that CephFS layouts are configured at the directory level via extended attributes, and that setting them on the root directory applies defaults filesystem-wide.

**Why:** CephFS file layouts are managed exclusively through virtual extended attributes (xattrs) on directories and files, not through `ceph fs set`. This is documented in the official Ceph file-layouts documentation.

### 2. Incorrect `deviceClass` placement in CephFilesystem YAML
**What was wrong:** The `deviceClass: ssd` field was nested inside the `replicated` block of the `metadataPool` spec. In Rook's CRD, `deviceClass` is a pool-level field — a sibling of `replicated`, not a child of it.

**What was changed:** Moved `deviceClass: ssd` from inside `replicated` to the `metadataPool` level (same indentation as `replicated`).

**Why:** The Rook CRD specification defines `deviceClass` as a field of PoolSpec, at the same level as `replicated` and `erasureCoded`. Nesting it inside `replicated` would cause it to be ignored or rejected by the Rook operator.

## Review Notes
- The `client_readahead_*` settings (`client_readahead_max_bytes`, `client_readahead_min`) apply to libcephfs/FUSE-based CephFS clients. When using Rook with ceph-csi, the default mount method is the kernel CephFS client, where readahead is controlled by Linux kernel settings (e.g., `/sys/class/bdi/`), not Ceph config options. The advice is technically correct for FUSE mounts but may not apply in the default Rook CSI configuration.
- The striping constraint (stripe_unit x stripe_count = object_size) is satisfied: 4MB x 8 = 32MB. This is correct.
- The fio benchmark command is syntactically correct and uses appropriate parameters for sequential read testing.
- The erasure coding configuration (6 data + 2 coding chunks) and the pattern of SSD metadata + HDD data pools is a well-established best practice for large file workloads.
