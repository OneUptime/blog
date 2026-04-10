# Validation Summary: How to Understand Cache Tiering Deprecation and Migration Path in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (RADOS, cache tiering, CRUSH device classes)
- Rook (Kubernetes Ceph operator)
- Kubernetes (Deployment manifests)
- Redis (application-layer caching example)

## Sources Consulted
- Ceph Reef 18.2.0 release notes — https://ceph.io/en/news/blog/2023/v18-2-0-reef-released/
- Ceph Squid 19.2.0 release notes — https://ceph.io/en/news/blog/2024/v19-2-0-squid-released/
- Ceph official documentation: Cache Tiering — https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph official documentation: CRUSH Maps — https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation: Pools — https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph PR#51653 (Quincy deprecation doc backport) and PR#51654 (Pacific deprecation doc backport)
- Ceph PR#45409 (re-adding proxy cache mode)
- Ceph PR#62211 (cache tier test suite removal in Squid)

## Issues Found

### 1. Squid 19.x cache tiering status incorrect
- **What was wrong:** The version table stated Squid 19.x as "Likely removed (check release notes)."
- **What was changed:** Updated to "Deprecated (tests removed, feature still present)." Cache tiering code remains in Squid; only the test suite was removed.
- **Why:** The Squid 19.2.0 release notes make no mention of cache tiering removal. The feature is still present but deprecated.

### 2. Incorrect cache mode for tier removal procedure
- **What was wrong:** The cache tier removal section used `ceph osd tier cache-mode cache-pool readproxy`.
- **What was changed:** Changed `readproxy` to `proxy`.
- **Why:** The official Ceph documentation for removing a writeback cache tier specifies `proxy` mode, not `readproxy`. The `proxy` mode ensures new and modified objects are properly flushed to the backing pool during draining, which is critical for safe cache tier removal.

### 3. Pacific and Quincy deprecation timeline overstated
- **What was wrong:** Pacific 16.x was listed as "Supported (with warnings)" and Quincy 17.x as "Supported (deprecation announced)," implying these versions originally shipped with deprecation signals.
- **What was changed:** Updated to "Supported (deprecation docs backported in 16.2.14)" and "Supported (deprecation docs backported in 17.2.7)" respectively. Reef 18.x updated to "Deprecated (first official deprecation)."
- **Why:** The deprecation was first officially announced in Reef 18.2.0 (August 2023). Documentation updates were retroactively backported to Pacific 16.2.14 (October 2023) and Quincy 17.2.7 (December 2023). The original table created a misleading impression of the deprecation timeline.

## Review Notes
- The Kubernetes Deployment YAML for Redis is incomplete (missing `selector` and `template.metadata.labels` fields), but it is clearly presented as an illustrative snippet rather than a production-ready manifest.
- The `ceph osd pool create` commands use explicit pg_num/pgp_num values (e.g., `64 64`). In modern Ceph (Nautilus+), the PG autoscaler typically manages this, so explicit PG counts are optional. The syntax is valid but slightly legacy.
- The blog correctly identifies the core reasons for cache tiering deprecation as documented in the Reef release notes: lack of maintainer, complexity, and production issues.
