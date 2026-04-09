# Validation Summary: How to Fix 'cannot find valid devices' in Rook-Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage)
- Kubernetes (kubectl CLI)
- Linux block device management (lsblk, wipefs, dd, fuser)
- LVM (pvremove, vgremove)
- LUKS (cryptsetup)
- ceph-volume CLI

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/
- Rook CephCluster CRD spec for `cleanupPolicy` and `deviceFilter` fields
- Rook OSD configuration documentation for device selection behavior
- Linux man pages for `wipefs`, `fuser`, `lsblk`, `pvremove`, `vgremove`, `cryptsetup`
- ceph-volume documentation for `lvm zap` and `lvm list` subcommands

## Issues Found
1. **LVM removal order in Step 3**: The post listed `pvremove` before `vgremove`. This is incorrect because `pvremove` will refuse to remove a physical volume that still belongs to a volume group (without the `-f` flag). The correct order is to remove the volume group first with `vgremove`, then remove the physical volume with `pvremove`. Fixed by swapping the order.

2. **Outdated cleanupPolicy syntax in Step 5**: The post referenced `cleanupPolicy: deleteDataDirOnHosts: "yes"`, which was the syntax used in older Rook versions (pre-1.7). Modern Rook uses `cleanupPolicy: confirmation: yes-really-destroy-data`. Fixed by updating to the current syntax.

## Review Notes
- All kubectl commands use correct syntax and flags.
- The `wipefs -a` and `dd` zeroing approach is the standard Rook-recommended method for preparing devices.
- The `ceph-volume lvm zap --destroy` command is correct for cleaning up BlueStore/OMAP metadata.
- The `deviceFilter` regex examples and testing approach are accurate.
- The force-reconcile annotation (`rook.io/force-reconcile`) is a valid and documented technique for triggering Rook re-evaluation.
- The `cryptsetup luksErase` command is correct for removing LUKS headers (available in cryptsetup 2.x+).
