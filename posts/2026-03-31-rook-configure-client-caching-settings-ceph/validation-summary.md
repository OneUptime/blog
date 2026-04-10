# Validation Summary: How to Configure Client Caching Settings in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (RBD client cache, CephFS client cache)
- librbd (RBD userspace library)
- libcephfs / ceph-fuse (CephFS FUSE client)
- CephFS kernel client (mount -t ceph)
- Ceph admin socket / ceph tell CLI

## Sources Consulted
- Ceph RBD Config Settings (Reef): https://docs.ceph.com/en/reef/rbd/rbd-config-ref/
- Ceph RBD man page: https://docs.ceph.com/en/latest/man/8/rbd/
- CephFS Troubleshooting (Quincy): https://docs.ceph.com/en/quincy/cephfs/troubleshooting/
- mount.ceph man page (Reef): https://docs.ceph.com/en/reef/man/8/mount.ceph/
- Ceph MDS admin socket cache drop removal PR #29210: https://github.com/ceph/ceph/pull/29210
- Ceph-fuse libfuse3 big_writes PR #34531: https://github.com/ceph/ceph/pull/34531

## Issues Found

1. **"enabled by default for non-librbd clients" (line 15)**: Incorrect. `rbd_cache` is a librbd setting and is enabled by default for all librbd clients. The phrase "non-librbd clients" is nonsensical since all RBD userspace access goes through librbd. Changed to "The RBD client cache (librbd cache) is enabled by default."

2. **"per-image via image features" (line 46)**: Wrong terminology. `rbd config image set` stores image-level configuration overrides, not image features. Image features are things like `layering`, `exclusive-lock`, `object-map`, etc. Changed to "per-image via image-level configuration override."

3. **`/proc/fs/ceph/*/stats` path (line 97)**: Incorrect path. The CephFS kernel client exposes debug info via debugfs at `/sys/kernel/debug/ceph/`, not `/proc/fs/ceph/`. Changed to `cat /sys/kernel/debug/ceph/*/mdsc`.

4. **`cache status` and `cache drop` admin socket commands (lines 106-107)**: These are not valid client admin socket commands. `cache drop` was an MDS admin socket command that was later removed (PR #29210) in favor of `ceph tell mds.X cache drop`. Replaced with `ceph daemon ... config show | grep rbd_cache` for checking client config and `ceph tell mds.0 cache drop` for dropping MDS cache.

## Review Notes

- `fuse_big_writes` (line 72) is a valid Ceph config option but is obsolete when using libfuse 3.0+, where big_writes is always enabled. On modern systems this setting has no effect. Not changed since it is still a recognized config key and won't cause errors.
- The kernel CephFS mount options (`rsize`, `wsize`, `readdir_max_bytes`) were verified as correct against the `mount.ceph` man page.
- All byte value calculations in comments are correct (64 MiB = 67108864, 48 MiB = 50331648, etc.).
- The writethrough mode explanation (setting `rbd_cache_max_dirty = 0`) is correct per official docs.
- The `rbd perf image iostat` command syntax is correct.
