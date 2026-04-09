# Validation Summary: How to Fix Slow or Unresponsive OSDs in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph OSDs (Object Storage Daemons)
- BlueStore (Ceph storage backend)
- Kubernetes (container orchestration)

## Sources Consulted
- [Ceph Health Checks Documentation](https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- [Ceph OSD Config Reference](https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- [Ceph BlueStore Configuration Reference](https://docs.ceph.com/en/quincy/rados/configuration/bluestore-config-ref/)
- [Ceph Troubleshooting OSDs Documentation](https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/)
- [ceph/ceph PR #19114: Drop REQUEST_SLOW/REQUEST_STUCK health warnings](https://github.com/ceph/ceph/pull/19114)
- [Ceph mClock Config Reference](https://docs.ceph.com/en/quincy/rados/configuration/mclock-config-ref/)

## Issues Found

1. **Incorrect health check code `REQUEST_SLOW`**: The post referenced `REQUEST_SLOW` as a health message to look for. This was an older health warning code that was dropped from Ceph (see ceph/ceph PR #19114). Modern Ceph versions (Nautilus and later, which Rook uses) report slow operations under the `SLOW_OPS` health check code. Changed `REQUEST_SLOW` to `SLOW_OPS`.

2. **Misleading BlueStore cache guidance**: The post stated "Increase the BlueStore cache size if your nodes have spare RAM" but the command only set `bluestore_cache_autotune true`, which is already the default and does not increase cache size. Per the BlueStore Config Reference, `bluestore_cache_autotune` enables automatic cache sizing within the bounds of `osd_memory_target` (default 4 GiB). To actually increase the memory available to BlueStore, `osd_memory_target` must be increased. Fixed the description and added the `osd_memory_target` command (set to 6 GiB as a reasonable example for nodes with spare RAM).

## Review Notes
- The `osd_recovery_max_active` option used in the `injectargs` command has been split into device-specific variants (`osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd`) in newer Ceph releases (Pacific+). The base option still works as a fallback, so the command is correct but operators with newer Ceph versions may want to use the device-specific variants for more precise control.
- The `injectargs` approach for recovery throttling is valid for temporary changes. For persistent configuration, `ceph config set` is preferred. The post correctly uses `injectargs` in the context of a temporary fix, which is appropriate.
- The `watch ceph status` command inside `kubectl exec` will work but requires the `watch` utility to be installed in the Rook toolbox container, which it is by default.
