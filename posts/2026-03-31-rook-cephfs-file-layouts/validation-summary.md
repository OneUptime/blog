# Validation Summary: How to Set CephFS File Layouts in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS (distributed filesystem)
- RADOS (Ceph's object storage layer)
- Kubernetes (kubectl CLI)
- Linux extended attributes (setfattr / getfattr)

## Sources Consulted
- Ceph official documentation — File layouts: https://docs.ceph.com/en/latest/cephfs/file-layouts/
- Ceph source — file-layouts.rst: https://github.com/ceph/ceph/blob/main/doc/cephfs/file-layouts.rst
- Ceph MDS Config Reference: https://github.com/ceph/ceph/blob/main/doc/cephfs/mds-config-ref.rst

## Issues Found

### 1. Invalid MDS config option `mds_default_dir_layout`
- **What was wrong:** The post used `ceph tell mds.myfs:0 config get mds_default_dir_layout` to view default layouts. `mds_default_dir_layout` is not a real Ceph MDS config option and this command would return an error on a real cluster.
- **What was changed:** Replaced with `ceph fs get myfs` which shows filesystem configuration including data pools, and clarified that `getfattr` from a mounted client is needed for actual layout attributes.
- **Why:** The original command does not exist in any version of Ceph. The closest real option is `mds_default_dir_hash` which controls directory fragment hashing, not file layouts.

### 2. Incorrect `getfattr` output format
- **What was wrong:** The output example showed individual lines like `ceph.file.layout.stripe_unit=4194304` as if each attribute were separate. The actual output of `getfattr -n ceph.file.layout` is a single compound line.
- **What was changed:** Updated the output example to match actual `getfattr` output format: `ceph.file.layout="stripe_unit=4194304 stripe_count=1 object_size=4194304 pool=myfs-data0"` with the standard `# file:` header line.
- **Why:** The corrected format matches what users will actually see when running the command, per the official Ceph documentation.

## Review Notes
- The default layout values (stripe_unit=4 MiB, stripe_count=1, object_size=4 MiB) are correct per official docs.
- The `setfattr` extended attribute names (`ceph.dir.layout.*` and `ceph.file.layout.*`) are all correct.
- The claim that file layouts cannot be changed after data is written is accurate — Ceph returns an error if you try to modify layout on a non-empty file.
- The striping math (8 × 4 MB = 32 MB effective stripe width) is correct.
- The `object_size` constraint that it must be a multiple of `stripe_unit` is not mentioned in the post, but the examples used are all valid multiples so no practical issue arises.
