# Validation Summary: How to Create ZFS Pools and Datasets on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenZFS / ZFS
- ZFS storage pools
- ZFS datasets and properties
- ZVols
- Linux block devices

## Sources Consulted
- OpenZFS zpool-create(8): https://openzfs.github.io/openzfs-docs/man/master/8/zpool-create.8.html
- OpenZFS zfs-create(8): https://openzfs.github.io/openzfs-docs/man/master/8/zfs-create.8.html
- OpenZFS zfsprops(7): https://openzfs.github.io/openzfs-docs/man/master/7/zfsprops.7.html
- OpenZFS RAIDZ basic concepts: https://openzfs.github.io/openzfs-docs/Basic%20Concepts/RAIDZ.html
- OpenZFS system administration guide: https://openzfs.org/wiki/System_Administration
- OpenZFS zpool-attach(8): https://openzfs.github.io/openzfs-docs/man/master/8/zpool-attach.8.html

## Issues Found
- The `zpool create` example for setting pool and dataset properties used inline comments after line-continuation backslashes. In Bash, the backslash must be the final character on the line to continue the command, so the example would not run as written. I removed the inline comments from the continued command and added the same explanations immediately after the code block.
- The RAIDZ table listed conventional practical minimums rather than OpenZFS's documented minimums. OpenZFS documents the minimum number of devices in a RAIDZ group as one more than the number of parity disks, so I changed RAIDZ1/RAIDZ2/RAIDZ3 minimums to 2/3/4 respectively.
- The planning section said the whole vdev topology is permanent. Current OpenZFS supports some expansion operations, including adding disks to RAIDZ vdevs, but does not allow changing the RAIDZ parity level or converting between mirror and RAIDZ. I narrowed the claim to the redundancy level.
- The disk identifier section said by-id paths "never change," which was too absolute. I changed it to say they are stable across reboots because they are based on device identifiers.
- The `fdisk` sector-size example used `/dev/sdb` immediately after recommending persistent by-id paths. I changed it to use a `/dev/disk/by-id/...` path.

## Review Notes
- The remaining examples use valid `zpool` and `zfs` syntax according to the current OpenZFS manual pages.
- Some dataset creation examples reuse names from earlier examples, such as `datapool/web`. They are technically valid as standalone examples, but readers running every command sequentially would need to destroy or rename earlier datasets before recreating them with different properties.
