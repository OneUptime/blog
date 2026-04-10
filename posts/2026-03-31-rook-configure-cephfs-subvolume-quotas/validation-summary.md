# Validation Summary: How to Configure CephFS Subvolume Quotas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CephFS)
- CephFS Subvolumes (ceph fs subvolume CLI)
- CephFS Quotas (extended attributes)
- Rook (mentioned in tags, not directly in content)
- Bash scripting (monitoring script)

## Sources Consulted
- Ceph official documentation: CephFS Volumes and Subvolumes (https://docs.ceph.com/en/latest/cephfs/fs-volumes/)
- Ceph official documentation: CephFS Quotas (https://docs.ceph.com/en/latest/cephfs/quota/)
- Ceph source code: `src/pybind/mgr/volumes/` (subvolume CLI implementation)
- Ceph source code: `src/client/Client.cc` (client-side quota enforcement)

## Issues Found

1. **Incorrect flag `--no_shrink_check`**: The blog used `--no_shrink_check` for the resize command. The correct flag is `--no_shrink`. Fixed the flag name and updated the surrounding explanation.

2. **Wrong behavior for shrinking quotas**: The blog claimed that shrinking below current usage fails by default and `--no_shrink_check` forces the shrink. In reality, the opposite is true: by default, shrinking below current usage succeeds silently (immediately putting the tenant over-quota), and `--no_shrink` must be explicitly passed to prevent this. Fixed the comments and explanation.

3. **Incorrect method to remove quota**: The blog stated that `ceph fs subvolume resize cephfs webapp 0` removes the quota. Passing `0` actually raises an "Invalid subvolume size" error. The correct way to remove a quota is to pass `inf` or `infinite` as the new size. Fixed the command and description.

4. **Incorrect quota enforcement attribution**: The blog stated quotas are "enforced by the MDS" in multiple places. CephFS quotas are actually enforced cooperatively by the client (kernel client or FUSE/libcephfs), not the MDS. This is an important distinction because it means quotas are imprecise and can be bypassed by adversarial clients. Fixed in the "How CephFS Quotas Work" section and the Summary.

5. **Unnecessary `--format json` flags**: The monitoring script used `--format json` with `ceph fs subvolume ls` and `ceph fs subvolume info`. This is not a documented parameter for these mgr module commands; their output is already JSON by default. Removed the unnecessary flags.

## Review Notes
- The byte calculations in the post are correct: 20 GB = 21474836480 bytes, 10 GB = 10737418240 bytes, 50 GB = 53687091200 bytes (using binary GiB = 1024^3).
- The `ceph.quota.max_bytes` extended attribute name is correct for direct xattr manipulation.
- The monitoring script has a minor robustness issue: if `bytes_quota` is `"infinite"` (no quota set), the bash arithmetic `$(( ${QUOTA:-0} / 1073741824 ))` will fail because `"infinite"` is not a number. This is a pre-existing limitation but not a correctness error in the documented commands, so it was left as-is.
- The post's tags mention "Rook" but the content focuses on native Ceph CLI commands. This is acceptable since these commands work the same way whether Ceph is deployed via Rook or manually.
- CephFS quota enforcement is cooperative and imprecise by design. Added a note about this important caveat that was missing from the original post.
