# Validation Summary: How to Expand a ZFS Pool by Adding New Disks on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenZFS / ZFS
- `zpool` command-line administration
- RAIDZ, mirror, spare, cache, and log vdevs

## Sources Consulted
- OpenZFS `zpool-add(8)`: https://openzfs.github.io/openzfs-docs/man/master/8/zpool-add.8.html
- OpenZFS `zpool-attach(8)`: https://openzfs.github.io/openzfs-docs/man/master/8/zpool-attach.8.html
- OpenZFS `zpool-online(8)`: https://openzfs.github.io/openzfs-docs/man/v2.0/8/zpool-online.8.html
- OpenZFS `zpoolprops(8)`: https://openzfs.github.io/openzfs-docs/man/v2.0/8/zpoolprops.8.html
- OpenZFS `zpool-remove(8)`: https://openzfs.github.io/openzfs-docs/man/v2.2/8/zpool-remove.8.html
- OpenZFS `zpoolconcepts(7)`: https://openzfs.github.io/openzfs-docs/man/v2.2/7/zpoolconcepts.7.html
- OpenZFS system administration notes for cache and log devices: https://openzfs.org/wiki/System_Administration
- OpenZFS Ubuntu installation documentation: https://openzfs.github.io/openzfs-docs/Getting%20Started/Ubuntu/index.html
- Ubuntu Launchpad `zfsutils-linux` package page for Ubuntu 26.04: https://launchpad.net/ubuntu/resolute/+package/zfsutils-linux

## Issues Found
- The post said a single disk cannot be added to an existing RAIDZ vdev to change its width. That is true for older OpenZFS releases, but OpenZFS 2.3 and newer support RAIDZ expansion via `zpool attach`. I updated the claim to be version-scoped and added the current `zpool attach tank raidz2-0 <device>` example.
- The L2ARC verification command used `grep cache`, which would only print the matching `cache` line and omit the cache device shown in the sample output. I changed it to `grep -A1 cache`.
- The SLOG example comment said `SLOG failure = potential data loss`, which was too broad. OpenZFS can survive loss of a log device if the next transaction group commit completes; the risk is specifically around acknowledged synchronous writes if the log device is lost around a crash. I removed the overbroad parenthetical while keeping the recommendation to mirror the SLOG.

## Review Notes
The remaining commands and explanations matched OpenZFS documentation: `zpool add` for top-level vdevs, `zpool offline`, `zpool replace`, `zpool online -e`, `autoexpand`, `autoreplace`, hot spares, cache devices, log devices, and top-level vdev removal caveats. The post intentionally uses example device IDs; readers still need to substitute their own `/dev/disk/by-id/` names.
