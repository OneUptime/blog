# Validation Summary: How to Enable and Size the RGW Cache in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (ConfigMap, kubectl)
- Ceph centralized configuration store

## Sources Consulted
- Ceph official documentation on RGW configuration options (https://docs.ceph.com/en/latest/radosgw/config-ref/)
- Ceph documentation on the centralized config store (`ceph config set/get`) (https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/)
- Rook documentation on advanced configuration via ConfigMap (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/)
- Ceph admin socket and perf counters documentation (https://docs.ceph.com/en/latest/man/8/ceph/#daemon)

## Issues Found
No technical issues found.

## Review Notes
- The `rgw_cache_enabled` and `rgw_cache_lru_size` parameters are verified as real Ceph RGW configuration options with correct default values.
- The `ceph config get/set client.rgw` commands use correct syntax for the centralized config store available since Ceph Luminous.
- The Rook `rook-config-override` ConfigMap approach with `[client.rgw.my-store.a]` section targeting is the documented method for overriding Ceph configuration in Rook-managed clusters.
- The admin socket `perf dump` command and socket path pattern (`/var/run/ceph/ceph-client.rgw.*.asok`) are correct for Rook-deployed RGW instances.
- The memory estimate of 1-2 KB per cache entry is a reasonable approximation, though actual memory usage depends on the size of cached metadata objects (bucket info entries are typically larger than user info entries).
- The `-it` flag on `kubectl exec` in the monitoring command is unnecessary when piping output but is harmless and will not cause errors in most terminal contexts.
