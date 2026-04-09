# Validation Summary: How to Use RBD Snapshots for VM Backup

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Rook (Ceph operator for Kubernetes)
- KVM/QEMU virtualization (virsh, qemu-guest-agent)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph official RBD man page: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph RBD Snapshots documentation: https://docs.ceph.com/en/latest/rbd/rbd-snapshot/
- libvirt virsh qemu-agent-command documentation

## Issues Found

1. **Incorrect terminology in Step 1**: The post described filesystem freeze/thaw as producing "crash-consistent" backups. This is backwards — crash-consistent means no guest coordination (equivalent to pulling the power cord). Freezing the guest filesystem with `guest-fsfreeze-freeze` produces **filesystem-consistent** backups. Fixed the wording to "filesystem-consistent."

2. **Invalid command `rbd snap info` in Step 5**: `rbd snap info` is not a valid Ceph RBD subcommand. The valid subcommands for `rbd snap` are: create, ls, rollback, rm, purge, protect, unprotect, rename. To get information about a specific snapshot, the correct command is `rbd info pool/image@snap`. Fixed to `rbd info`.

3. **Invalid `rbd snap purge --snap-name` in Step 7**: `rbd snap purge` removes **all** unprotected snapshots from an image and does not accept a `--snap-name` flag. To remove a single specific snapshot, `rbd snap rm pool/image@snapname` is the correct command. Fixed to use `rbd snap rm` with the correct snapshot spec syntax.

## Review Notes
- The backup script in Step 7 only removes the snapshot from exactly 7 days ago rather than all snapshots older than 7 days. This is a logic limitation but not a technical error — a production script would likely iterate over `rbd snap ls` output to prune all old snapshots.
- The `date -d '-7 days'` syntax is GNU coreutils-specific (Linux). This is acceptable since the script runs in a Kubernetes/Linux context.
- The clone workflow in Step 6 correctly shows protecting the snapshot before cloning, which is required by Ceph for clone operations.
- All `rbd export`, `rbd export-diff`, `rbd snap create`, `rbd snap rollback`, and `rbd clone` commands use correct syntax.
