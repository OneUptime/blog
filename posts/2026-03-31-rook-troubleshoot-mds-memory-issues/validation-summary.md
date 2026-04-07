# Validation Summary: How to Troubleshoot MDS Memory Usage Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server)
- CephFS (Ceph Filesystem)
- Kubernetes (pod resources, kubectl)

## Sources Consulted
- Ceph official documentation on MDS configuration options: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/
- Ceph admin socket vs `ceph tell` command documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Filesystem/ceph-filesystem-crd/
- Ceph MDS cache management documentation: https://docs.ceph.com/en/latest/cephfs/cache-configuration/

## Issues Found

### 1. `ceph daemon` used from tools pod (incorrect)
- **What was wrong:** The post used `ceph daemon mds.myfs.a cache status` and `ceph daemon mds.myfs.a session ls` executed from the `rook-ceph-tools` deployment. The `ceph daemon` command connects via the local admin socket (`/var/run/ceph/.../*.asok`), which only exists inside the MDS pod itself, not the tools pod. These commands would fail with a "no such file" error.
- **What was changed:** Replaced `ceph daemon` with `ceph tell` in both occurrences. `ceph tell` sends commands to the daemon via the Ceph monitors, so it works from any pod with Ceph client access (including the tools pod).
- **Why:** This is a common Rook troubleshooting pitfall. The tools pod has the Ceph client and keyring but not the daemon admin sockets.

### 2. `mds_cache_trim_threshold` is not a valid Ceph option
- **What was wrong:** The post used `ceph config set mds mds_cache_trim_threshold 0.7` which is not a recognized Ceph configuration option. This command would fail with an "unrecognized option" error.
- **What was changed:** Replaced with `ceph config set mds mds_cache_reservation 0.10`. The `mds_cache_reservation` option (default 0.05) controls the fraction of the cache memory limit that MDS tries to keep free. Increasing it to 0.10 makes the MDS trim the cache more aggressively by maintaining a larger free buffer.
- **Why:** Using a non-existent config option would confuse readers and fail silently or with an error.

## Review Notes
- The `MDS_CACHE_MEMORY_LIMIT` key in the Rook CRD YAML config section uses uppercase with underscores. The canonical Ceph config option name is `mds_cache_memory_limit` (lowercase). The Rook CRD may accept either format depending on version, but readers should be aware that the standard Ceph convention is lowercase.
- The `mds_journal_max_events` option used in the "Reducing Cache Memory Usage" section may not exist in all Ceph versions. The related option `mds_log_max_events` controls MDS journal event limits. Readers should verify the correct option name for their Ceph version.
- The `mds_max_caps_per_client` option should be verified against the target Ceph version, as capability-related config options have changed across releases.
- The `metadataServer.config` field shown in the Rook CRD YAML may not be a valid field in all Rook versions. MDS-specific Ceph config is often set via `ceph config set mds` commands or through the rook-config-override ConfigMap rather than inline in the CRD.
- The ~500MB base overhead estimate for the Ceph library is a rough approximation that varies by Ceph version and build configuration. This is reasonable as a general guideline.
