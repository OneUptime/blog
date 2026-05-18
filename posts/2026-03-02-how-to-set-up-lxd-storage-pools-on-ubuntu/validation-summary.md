# Validation Summary: How to Set Up LXD Storage Pools on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LXD (system container/VM manager)
- ZFS (storage backend)
- btrfs (storage backend)
- LVM (storage backend)
- Directory (dir) storage backend
- Ceph (referenced in comparison table)
- Ubuntu

## Sources Consulted
- LXD documentation — Storage pools: https://documentation.ubuntu.com/lxd/en/latest/explanation/storage/
- LXD documentation — `lxc storage` CLI: https://documentation.ubuntu.com/lxd/en/latest/reference/manpages/lxc/storage/
- LXD documentation — Storage drivers (ZFS, btrfs, LVM, dir, Ceph): https://documentation.ubuntu.com/lxd/en/latest/reference/storage_drivers/
- LXD snap data layout (loop files stored under `/var/snap/lxd/common/lxd/disks/`)
- OpenZFS documentation — `atime`, `compression`, and `zfs_arc_max` module parameter: https://openzfs.github.io/openzfs-docs/

## Issues Found

1. **Incorrect loop file path comment.** The code comment in the "Using a Loop File" section read `# LXD creates a file at /var/snap/multipass/... and sets up ZFS automatically`. Multipass is a different Canonical product (Ubuntu VM tool) and has no relationship to LXD storage. The LXD snap stores loop-backed storage pool images under `/var/snap/lxd/common/lxd/disks/<pool>.img`. Updated the comment to reference the correct path: `/var/snap/lxd/common/lxd/disks/default.img`.

## Review Notes

- The LVM row in the storage backends comparison table states "No" for copy-on-write. In practice, LXD's `lvm` driver creates a thin pool by default (`lvm.use_thinpool=true`), and thin LVM volumes do support CoW snapshots. The post's wording is a reasonable simplification (it later mentions LVM snapshots are "Fast"), but readers running heavy/non-thin volumes will get different behavior. Not strictly incorrect, but worth keeping in mind.
- The `zfs_arc_max` default ("50% of RAM") is accurate for current OpenZFS on Linux; earlier ZoL releases used different defaults, so the value is correct for modern Ubuntu LTS releases targeted by this post.
- `lxc storage volume info` output for non-ZFS/btrfs drivers may not include a "space used" line, so the awk/grep monitoring loop will fall through to "N/A" for those — this is consistent with what the script handles via the `|| echo "N/A"` fallback.
- All other `lxc storage`, `lxc storage volume`, `lxc config device`, `lxc snapshot`, `lxc copy`, and `lxc move` invocations match current LXD CLI syntax and flag names (e.g. `-s`/`--storage`, `size=`, `pool=`).
