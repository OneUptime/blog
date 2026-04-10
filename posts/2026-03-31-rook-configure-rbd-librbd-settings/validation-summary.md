# Validation Summary: How to Configure RBD librbd Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RBD (RADOS Block Device)
- librbd (userspace RBD client library)
- Kubernetes ConfigMaps
- kubectl CLI

## Sources Consulted
- Ceph official RBD config reference: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph source code RBD options definition: https://github.com/ceph/ceph/blob/main/src/common/options/rbd.yaml.in
- Ceph rbd(8) man page: https://github.com/ceph/ceph/blob/main/doc/man/8/rbd.rst
- Ceph Octopus release notes (rbd_io_scheduler introduction): https://docs.ceph.com/en/octopus/releases/octopus/
- Rook documentation on Ceph config override: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found

1. **Incorrect readahead option names (lines 114-115):** The post used `rbd_read_ahead_trigger_requests` and `rbd_read_ahead_max_bytes` with an extra underscore splitting "read" and "ahead". The correct Ceph option names are `rbd_readahead_trigger_requests` and `rbd_readahead_max_bytes` (one word "readahead"). Fixed both occurrences.

2. **Missing config entity in `rbd config global set` command (line 71):** The command `rbd config global set rbd_default_order 22` was missing the required `<config-entity>` positional parameter. The correct syntax is `rbd config global set <config-entity> <key> <value>`. Fixed to `rbd config global set global rbd_default_order 22`.

## Review Notes
- `rbd_io_scheduler` and `rbd_io_scheduler_simple_max_delay` are valid Ceph options (introduced in Octopus v15.2.0) but are not listed on the official docs.ceph.com config reference page. They are defined in the source code and mentioned in the Octopus release notes.
- `rbd_default_map_options` in the ConfigMap example is primarily relevant to kernel RBD (`krbd`) mapping, not userspace librbd clients. Including it in the `[client]` section won't cause errors but may be misleading in a post focused specifically on librbd.
- `rbd_default_features = 125` includes journaling (bit 64), which is needed for RBD mirroring. This is a valid but non-default value (default is typically 61). Users who don't need mirroring may want to omit journaling.
- All byte value calculations in comments are correct (128 MiB, 96 MiB, 64 MiB, 512 KiB).
- Cache setting relationships are valid: `rbd_cache_target_dirty` < `rbd_cache_max_dirty` < `rbd_cache_size`.
