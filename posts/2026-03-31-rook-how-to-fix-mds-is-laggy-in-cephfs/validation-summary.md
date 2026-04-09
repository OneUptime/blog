# Validation Summary: How to Fix 'mds is laggy' in CephFS

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- Ceph MDS (Metadata Server)
- Kubernetes (kubectl)

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/
- Ceph MDS admin commands: https://docs.ceph.com/en/latest/cephfs/administration/
- Ceph client eviction documentation: https://docs.ceph.com/en/latest/cephfs/eviction/
- Ceph MDS standby documentation: https://docs.ceph.com/en/latest/cephfs/standby/

## Issues Found

1. **Invalid `config` field in CephFilesystem CRD (Step 4):** The YAML example included a `config` map under `spec.metadataServer` with `mds_cache_memory_limit`. The Rook `CephFilesystem` CRD does not have a `config` field under `metadataServer`. Removed the `config` block and replaced it with the correct approach: using `ceph config set mds mds_cache_memory_limit <value>` via the toolbox pod for persistent configuration.

2. **Incorrect `injectargs` option format (Step 4):** The `injectargs` command used hyphens (`--mds-cache-memory-limit`) instead of the canonical underscore form (`--mds_cache_memory_limit`). Changed to underscores for consistency with Ceph configuration naming conventions.

3. **Incorrect client eviction command (Step 5):** The command `ceph tell mds.myfs-a evict_client <client-id>` is not valid. The correct syntax is `ceph tell mds.myfs-a client evict id=<client-id>`. Fixed accordingly.

4. **Inaccurate standby MDS description (Step 7):** The post claimed that `activeStandby: true` deploys a standby "pre-loaded with metadata cache." This is incorrect — a standby MDS does not pre-load the metadata cache; only a standby-replay MDS follows the active MDS's journal. A regular standby is a running daemon that can take over the rank but must rebuild its cache after failover. Updated the description to accurately reflect this behavior.

## Review Notes
- The `ceph tell mds.myfs-a cache status` command (Step 3) and its example output are simplified representations. The actual output structure may vary by Ceph version. The concept being demonstrated (checking MDS memory pressure) is correct.
- The `injectargs` command is presented as a dynamic/temporary alternative. The post now also includes the persistent `ceph config set` approach, which is the recommended method in modern Ceph.
- The overall troubleshooting flow (check status, check resources, check memory, tune cache, check clients, check pool, enable standby, restart) is sound and follows best practices for MDS laggy diagnosis.
