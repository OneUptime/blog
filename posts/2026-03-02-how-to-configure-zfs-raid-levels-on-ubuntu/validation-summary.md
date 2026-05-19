# Validation Summary: How to Configure ZFS RAID Levels (mirror, raidz, raidz2) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenZFS / ZFS
- ZFS pools and vdevs
- Mirror, RAIDZ1, RAIDZ2, and RAIDZ3 layouts
- ZFS hot spares, ARC, L2ARC, and SLOG
- Linux shell commands and benchmarking tools (`dd`, `fio`)

## Sources Consulted
- OpenZFS `zpool-create(8)` documentation: https://openzfs.github.io/openzfs-docs/man/v2.3/8/zpool-create.8.html
- OpenZFS `zpoolconcepts(8)` documentation: https://openzfs.github.io/openzfs-docs/man/v2.0/8/zpoolconcepts.8.html
- OpenZFS `zpool-add(8)` documentation: https://openzfs.github.io/openzfs-docs/man/master/8/zpool-add.8.html
- OpenZFS `zpoolprops(8)` documentation for `autoreplace`: https://openzfs.github.io/openzfs-docs/man/v2.0/8/zpoolprops.8.html
- OpenZFS System Administration guide: https://openzfs.org/wiki/System_Administration
- OpenZFS module parameter documentation for `zfs_arc_max`: https://openzfs.github.io/openzfs-docs/Performance%20and%20Tuning/Module%20Parameters.html
- Ubuntu ZFS storage pool tutorial: https://ubuntu.com/tutorials/setup-zfs-storage-pool
- Ubuntu `zfs-zed` package information: https://packages.ubuntu.com/questing/zfs-zed

## Issues Found
- The disk-identification command printed fields from `ls -la` in an order that did not match the example output and could be brittle. Replaced it with a shell loop that resolves each `/dev/disk/by-id/*` symlink to the block device and prints the stable by-id path.
- The hot-spare section said a spare automatically replaces a failed disk without noting the required ZFS automation. Updated the wording to state that `autoreplace` must be enabled and the ZFS Event Daemon must be running, and added the `systemctl enable --now zfs-zed` command before setting `autoreplace=on`.
- The cache-flushing command used `sudo echo 3 > /proc/sys/vm/drop_caches`, which does not elevate the shell redirection. Replaced it with `echo 3 | sudo tee /proc/sys/vm/drop_caches`.
- The SLOG section described the log device as a write cache. Corrected it to describe SLOG as a separate intent log that can improve synchronous write latency, and updated the command comment accordingly.

## Review Notes
The main ZFS pool creation examples align with OpenZFS documented syntax for mirror, RAIDZ, RAIDZ2, RAIDZ3, spare, cache, and log vdevs. The capacity figures are simplified approximations and do not account for metadata, padding, ashift, reserved space, compression, or mixed disk sizes, but they are reasonable for an introductory guide.
