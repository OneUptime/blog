# Validation Summary: How to Create CephFS Subvolumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CephFS filesystem)
- Rook (context: Ceph orchestration)
- CephFS subvolumes (fs-volumes subsystem)
- Kernel CephFS mount client
- `ceph` CLI (fs subvolume commands)

## Sources Consulted
- Ceph official documentation — CephFS Volumes and Subvolumes: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- Ceph official documentation (Reef release) — CephFS Volumes: https://docs.ceph.com/en/reef/cephfs/fs-volumes/
- Ceph official documentation — Mount CephFS using Kernel Driver: https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/

## Issues Found
1. **Incorrect flag `--data_pool` on line 69**: The `ceph fs subvolume create` command used `--data_pool cephfs.data.fast`, but the correct flag name is `--pool_layout`. Changed to `--pool_layout cephfs.data.fast`. The flag has been `--pool_layout` across all documented Ceph releases.

## Review Notes
- The kernel mount syntax in the "Mounting a Subvolume" section uses the legacy device string format (`mon1:6789,mon2:6789,mon3:6789:/path`). This still works for backward compatibility, but Reef and later releases recommend the new syntax: `name@fsid.fs_name=/path` with `mon_addr=` in the mount options. The legacy syntax is not wrong, so no change was made, but a future update could modernize this.
- The `ceph fs subvolume info` example output omits `mtime` and `ctime` fields that are present in real output. This is acceptable for an illustrative example.
- All other commands, flags (`--size`, `--mode`, `--uid`, `--gid`, `--group_name`, `--namespace-isolated`), path formats, and JSON output fields are accurate per the official documentation.
