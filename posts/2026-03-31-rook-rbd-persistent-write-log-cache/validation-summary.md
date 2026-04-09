# Validation Summary: How to Configure RBD Persistent Write Log Cache

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RBD — RADOS Block Device)
- Rook (Ceph operator for Kubernetes)
- RBD Persistent Write Log (PWL) cache
- Kubernetes (ConfigMaps, DaemonSets, StorageClasses)

## Sources Consulted
- [RBD Persistent Write Log Cache — Ceph Documentation (latest)](https://docs.ceph.com/en/latest/rbd/rbd-persistent-write-log-cache/)
- [RBD Persistent Write-back Cache — Ceph Documentation (Pacific)](https://docs.ceph.com/en/pacific/rbd/rbd-persistent-write-back-cache/)
- [Config Settings — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/rbd/rbd-config-ref/)
- [rbd man page — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/man/8/rbd/)
- [Configuring the Persistent Write Log Cache — OpenStack-Ansible Documentation](https://docs.openstack.org/openstack-ansible-ceph_client/2023.1/config-persistent-write-log-cache.html)
- [IBM Storage Ceph 7.1.0 — Enabling persistent cache](https://www.ibm.com/docs/en/storage-ceph/7.1.0?topic=cache-enabling)
- [IBM Storage Ceph 7.0.0 — Flushing persistent cache](https://www.ibm.com/docs/en/storage-ceph/7.0.0?topic=cache-flushing)
- [Ceph GitHub PR #45895 — rbd persistent cache UX improvements](https://github.com/ceph/ceph/pull/45895)

## Issues Found

1. **Missing `rbd_plugins = pwl_cache` in ConfigMap (Step 2)**: The Rook config override ConfigMap was missing the required `rbd_plugins = pwl_cache` line. Per Ceph documentation, both `rbd_plugins = pwl_cache` and `rbd_persistent_cache_mode` must be set to enable the persistent write log cache. Added the missing line.

2. **Invalid RBD image feature `write-cache` (Step 4)**: The post instructed readers to run `rbd feature enable replicapool/myimage write-cache`, but `write-cache` is not a valid RBD image feature. The valid features are: layering, striping, exclusive-lock, object-map, fast-diff, deep-flatten, journaling, and data-pool. The actual prerequisite for PWL cache is the `exclusive-lock` feature. Changed the command to `rbd feature enable replicapool/myimage exclusive-lock` and updated the step title and description.

3. **Incorrect command for verifying cache activity (Step 5)**: The post used `rbd perf image iostat replicapool --format json` to check cache activity. While this command shows general I/O performance statistics, it does not display persistent cache state. The correct command is `rbd status replicapool/myimage`, which shows a `Persistent cache state` section with allocated bytes, cached bytes, dirty bytes, and hit/miss statistics. Replaced the command and updated the description.

4. **Incorrect cache flush command (Step 6)**: The post used `rbd cache flush replicapool/myimage`, but `rbd cache flush` is not a valid rbd subcommand. The correct command is `rbd persistent-cache flush replicapool/myimage`, which was introduced in the Ceph Pacific/Quincy releases. Fixed the command.

5. **Summary section references to fixed issues**: Updated the Summary paragraph to reference `pwl_cache` plugin, `exclusive-lock` feature, and the correct `rbd persistent-cache flush` command, consistent with the fixes above.

## Review Notes
- The `rbd_cache`, `rbd_cache_size`, `rbd_cache_max_dirty`, and `rbd_cache_target_dirty` settings in the ConfigMap are standard librbd in-memory cache settings, separate from the persistent write log cache. Including them is not wrong — they can coexist and complement PWL cache — but readers should understand these control the in-memory write-back cache layer, not the persistent log itself.
- The Step 7 StorageClass configuration is a standard Rook-Ceph block StorageClass. It does not contain any PWL-specific parameters; the PWL cache is configured at the client level via the ConfigMap. The StorageClass does correctly include `exclusive-lock` in `imageFeatures`, which is the prerequisite for PWL. The section heading could be clarified in a future revision to note that this is a standard StorageClass with the required `exclusive-lock` feature, rather than implying it directly configures PWL cache.
- The `rbd persistent-cache flush` command was introduced in Ceph Pacific (v16.2.x). Readers on older Ceph versions may not have this command available.
