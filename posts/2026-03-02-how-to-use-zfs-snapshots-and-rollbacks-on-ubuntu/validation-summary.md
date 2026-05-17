# Validation Summary: How to Use ZFS Snapshots and Rollbacks on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ZFS (OpenZFS on Linux)
- Ubuntu
- sanoid (snapshot management daemon)
- systemd timers
- cron
- bash scripting

## Sources Consulted
- OpenZFS documentation — `zfs-snapshot(8)`, `zfs-rollback(8)`, `zfs-destroy(8)`, `zfs-clone(8)`, `zfs-promote(8)`, `zfs-list(8)`: https://openzfs.github.io/openzfs-docs/man/master/8/
- OpenZFS Snapshots and Clones: https://openzfs.github.io/openzfs-docs/Basic%20Concepts/Snapshots.html
- sanoid project documentation: https://github.com/jimsalterjrs/sanoid
- Ubuntu package documentation for `sanoid` and `zfsutils-linux`

## Issues Found

1. **Incorrect interactive prompt for `zfs rollback -r`.** The post claimed that `zfs rollback -r` shows a `will destroy the following snapshots:` listing and a `continue? [y/n]:` confirmation prompt. This is not how the command behaves — `zfs rollback -r` (and `-R`) immediately destroys any snapshots newer than the target without prompting. Replaced the fictitious output block with an accurate description of the non-interactive behavior, including a note about the `-R` flag for handling clones.

2. **Misleading "pattern match" comment in destroy examples.** The post showed `sudo zfs destroy datapool/web@daily_backup` with the comment "Delete all snapshots matching a pattern". `zfs destroy` does not perform any wildcard/pattern matching — it destroys the exact named snapshot. The range syntax (`first%last`) shown immediately afterwards is the correct way to delete multiple snapshots. Removed the misleading example/comment since the basic single-snapshot delete is already shown immediately above it.

## Review Notes

- The LVM comparison in the intro ("LVM snapshots which use copy-on-write with a separate storage pool") is a loose analogy — LVM classic snapshots use a snapshot logical volume inside the same volume group, not a separate pool. The wording is informal but not actively misleading, so left as-is.
- The `mount -t zfs <pool>/<ds>@<snap> /mnt/...` example is supported by the OpenZFS mount helper on Linux; the mount will be read-only since snapshots are inherently read-only.
- The bash script uses GNU `head -n -N` semantics (drop last N lines), which is available in Ubuntu's coreutils — correct for the target platform.
- The sanoid config uses valid retention keys (`frequently`, `hourly`, `daily`, `monthly`, `yearly`); note that sanoid intentionally has no `weekly` key.
- `sanoid` is available in Ubuntu's universe repository from 20.04 onward; users on older Ubuntu releases may need the PPA or to install from source.
- The post never explicitly notes the `snapdir` property that controls whether `.zfs` is hidden vs visible — minor enhancement opportunity, not a correctness issue.
