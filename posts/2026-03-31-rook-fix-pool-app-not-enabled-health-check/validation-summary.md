# Validation Summary: How to Fix POOL_APP_NOT_ENABLED Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph orchestrator for Kubernetes)
- Ceph OSD pool management
- Ceph application tagging (introduced in Luminous)
- RADOS object store

## Sources Consulted
- Ceph man page for `ceph(8)` via https://www.mankier.com/8/ceph and https://manpages.debian.org/experimental/ceph-common/ceph.8.en.html
- Ceph source code MonCommands.h for `osd pool application` subcommands
- Ceph official documentation on CephFS file layouts and disaster recovery (https://docs.ceph.com/en/latest/cephfs/file-layouts/)
- Ceph documentation on pool operations and application tags

## Issues Found

### 1. Incorrect command syntax in "Enabling with Parameters" section (line 77-79)
- **What was wrong:** The post showed `ceph osd pool application enable <pool-name> <app-name> [<key>] [<value>]`, implying the `enable` subcommand accepts key-value parameters. The `enable` subcommand only accepts a pool name and application name. Key-value metadata is set with the separate `set` subcommand.
- **What was changed:** Replaced the section with the correct `ceph osd pool application set <pool-name> <app-name> <key> <value>` syntax and renamed the heading to "Setting Application Metadata".
- **Why:** Using the wrong subcommand would produce a CLI error, confusing readers.

### 2. Incorrect CephFS object name pattern (line 93)
- **What was wrong:** The post listed `.ceph-osd.*` as a CephFS-related object name pattern. This is not a documented or recognized object name pattern in CephFS pools.
- **What was changed:** Replaced with the correct CephFS data pool object naming pattern: `<inode_hex>.<offset_hex>` (e.g., `10000000000.00000000`).
- **Why:** The original pattern could mislead users trying to identify CephFS pools by their object contents.

### 3. Incorrect ordering in "Deleting Truly Orphaned Pools" section (lines 95-107)
- **What was wrong:** The pool deletion command (`ceph osd pool rm`) was shown before the prerequisite step of enabling pool deletion (`ceph config set mon mon_allow_pool_delete true`). Following the commands in order would result in the delete failing.
- **What was changed:** Reordered so the `mon_allow_pool_delete` configuration is set first, followed by the `ceph osd pool rm` command.
- **Why:** The prerequisite must be enabled before the delete command will succeed.

## Review Notes
- The `ceph osd pool rm` command is used (rather than `ceph osd pool delete`). Both work, and `rm` is actually the non-deprecated form in the Ceph source code, so this is correct.
- The post correctly identifies that application tags were introduced in Ceph Luminous. All commands are compatible with current Ceph releases.
- The RGW pool names shown (`default.rgw.buckets.data`, etc.) use the default zone/realm naming. Users with custom zone or realm configurations will have different pool names, but this is a reasonable default to show.
