# Validation Summary: How to Set Up RBD Persistent Cache for Read-Heavy Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- RBD persistent write-back cache (PWL cache plugin, `ssd` and `rwl` modes)
- Kubernetes DaemonSets
- NVMe/SSD and PMEM local storage

## Sources Consulted
- Ceph RBD Persistent Write Log Cache documentation: https://docs.ceph.com/en/latest/rbd/rbd-persistent-write-log-cache/
- Ceph RBD Persistent Read-only Cache documentation: https://docs.ceph.com/en/latest/rbd/rbd-persistent-read-only-cache/
- Ceph RBD Configuration Reference: https://docs.ceph.com/en/squid/rbd/rbd-config-ref/
- Ceph `rbd` man page: https://docs.ceph.com/en/reef/man/8/rbd/
- Kubernetes pause container registry migration: https://registry.k8s.io

## Issues Found

1. **Incorrect terminology — "persistent write log (PWL)" conflated with read cache (Description, Section 1)**
   - **What was wrong:** The post described the feature as a "persistent write log (PWL) cache" and claimed it accelerates "read-heavy workloads" by acting as a "local read buffer." The PWL cache (both `rwl` and `ssd` modes) is fundamentally a **write-back** cache. It does not proactively cache reads. Reads can only be served from data that was recently written and not yet flushed.
   - **What was changed:** Corrected terminology to "persistent write-back cache" and reframed the description to accurately describe write acceleration with subsequent read benefits for recently written data.

2. **Missing required `rbd_plugins` configuration (Sections 3 and 4)**
   - **What was wrong:** The `rbd_plugins = pwl_cache` setting was not included in either the per-image or global configuration. This setting is required to load the persistent cache plugin; without it, the cache mode settings have no effect.
   - **What was changed:** Added `rbd_plugins pwl_cache` as the first configuration command in both the per-image and global configuration sections.

3. **Incorrect cache invalidation behavior (Section 7)**
   - **What was wrong:** The post stated "The persistent cache is invalidated automatically when the RBD image is closed cleanly." This is incorrect — the entire purpose of the persistent cache is that it survives restarts. On clean close, dirty data is flushed to OSDs, but the cache file is preserved on disk for reuse on next open.
   - **What was changed:** Corrected to explain that cache files persist across restarts, dirty data is flushed on clean close, and cache files must be explicitly removed if cleanup is desired.

4. **Non-standard monitoring command (Section 6)**
   - **What was wrong:** Used `rbd perf image stats` which, while technically valid, is uncommon and less well-documented. The standard command for monitoring image I/O performance is `rbd perf image iostat`.
   - **What was changed:** Replaced `rbd perf image stats` with `rbd perf image iostat`.

5. **Outdated pause container image (DaemonSet YAML)**
   - **What was wrong:** Used `gcr.io/google_containers/pause:3.1`, which references the deprecated Google Container Registry path and an old image version.
   - **What was changed:** Updated to `registry.k8s.io/pause:3.9`, the current canonical registry and version.

## Review Notes
- For workloads that are truly read-heavy and need a dedicated read cache, Ceph provides a separate feature: the **Immutable Object Cache** (`ceph-immutable-object-cache` daemon), documented at https://docs.ceph.com/en/latest/rbd/rbd-persistent-read-only-cache/. This is distinct from the write-back cache covered in this post.
- The `chmod 777` on the cache directory is a security concern in production environments. A more restrictive permission (e.g., `chmod 750` with appropriate group ownership) would be preferable, though this was left unchanged as it is a style/security recommendation rather than a correctness issue.
- The post's title still references "Read-Heavy Workloads" which is somewhat misleading given the write-back nature of the cache. The content was corrected to accurately describe the feature's behavior, but a title change was not made as it would go beyond fixing technical errors.
