# Validation Summary: How to Use rbd-nbd for RBD Debugging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- rbd-nbd (userspace RBD-to-NBD mapper)
- Linux NBD (Network Block Device)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (PV/PVC, kubectl)
- ext4 / XFS filesystem tools (fsck.ext4, xfs_repair)

## Sources Consulted
- rbd-nbd man page (Ceph Reef): https://docs.ceph.com/en/reef/man/8/rbd-nbd/
- rbd-nbd.rst source on GitHub: https://github.com/ceph/ceph/blob/main/doc/man/8/rbd-nbd.rst
- rbd-nbd.cc source on GitHub: https://github.com/ceph/ceph/blob/main/src/tools/rbd_nbd/rbd-nbd.cc
- Ceph configuration documentation: https://docs.ceph.com/en/reef/rados/configuration/ceph-conf/
- Ceph global options source (global.yaml.in): https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in
- Rook Ceph Disaster Recovery docs: https://www.rook.io/docs/rook/latest-release/Troubleshooting/disaster-recovery/

## Issues Found

1. **fsck on mounted filesystem (dangerous)**: The "Mount and Inspect the Filesystem" section ran `fsck.ext4` and `xfs_repair` on `/dev/nbd0` while it was still mounted at `/mnt/rbd-debug`. Running filesystem check/repair tools on a mounted device can cause data corruption. Fixed by adding `umount /mnt/rbd-debug` before the fsck commands and updating the comments to clarify the device must be unmounted.

2. **Incorrect debug options syntax**: The "Enable Debug Logging" section used `-- --debug-rbd 20 --debug-ms 1` with a double-dash (`--`) separator before Ceph global options. Ceph's `global_init()` parses global options (like `--debug-rbd`, `--debug-ms`) directly from the command line without needing a separator. The `--` could cause these options to be misinterpreted as positional arguments. Fixed by removing the `--` separator.

3. **Non-existent `--force` flag for rbd-nbd unmap**: The "Unmap the Device" section used `rbd-nbd unmap --force /dev/nbd0`, but rbd-nbd's `unmap` subcommand does not support a `--force` flag (that feature exists for the kernel RBD driver via `rbd device unmap -o force`, not rbd-nbd). Fixed by replacing with `rbd-nbd detach /dev/nbd0`, which is the documented rbd-nbd subcommand for forcefully removing a mapping.

## Review Notes
- The `--log-file` option used in the debug logging section is a Ceph global option (not rbd-nbd-specific), but it works correctly when passed on the command line to any Ceph binary including rbd-nbd.
- The Rook secret name `rook-ceph-admin-keyring` is correct but may not exist in all Rook deployments depending on configuration. Users may need to check their specific Rook setup.
- The `dd` performance test commands are correct but lack `status=progress` which would be helpful for monitoring long-running tests. Not changed since this is a style preference, not a technical error.
