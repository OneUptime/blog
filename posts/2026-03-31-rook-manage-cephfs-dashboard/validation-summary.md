# Validation Summary: How to Manage CephFS from the Ceph Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- CephFS (Ceph Filesystem)
- Ceph Dashboard (web-based management UI)
- MDS (Metadata Server) daemons
- Ceph subvolumes and subvolume groups
- kubectl (Kubernetes CLI)

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Filesystem/ceph-filesystem-crd/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph MDS CLI reference: https://docs.ceph.com/en/latest/man/8/ceph/#mds
- Ceph FS subvolume documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- Ceph `tell` command reference: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph FS configuration reference: https://docs.ceph.com/en/latest/cephfs/multimds/

## Issues Found

1. **Invalid CLI command `ceph mds perf dump`**: The `ceph mds` module does not have a `perf` subcommand. The correct way to dump MDS performance counters is via `ceph tell mds.<daemon_name> perf dump`. Changed to `ceph tell mds.myfs-a perf dump` to match the `myfs` filesystem name used throughout the post.

2. **Misleading code comment**: The comment `# Mount the filesystem to set quotas` was inaccurate — the commands create subvolumes with size quotas via the Ceph CLI, not mount the filesystem. Changed to `# Create subvolumes with size quotas`.

3. **Internal inconsistency about quota management**: The Overview stated the Dashboard allows you to "manage quotas without using the command line," but the "Setting Directory Quotas via CLI" section explicitly states "The Dashboard shows quotas but CLI is needed to set them." Fixed the Overview to say "view quotas" instead of "manage quotas" to be consistent with the rest of the post.

## Review Notes
- The CephFilesystem CRD YAML is correct and follows current Rook API conventions (`ceph.rook.io/v1`).
- All `kubectl exec` commands correctly target `deploy/rook-ceph-tools` in the `rook-ceph` namespace, which is the standard Rook toolbox pattern.
- The `--size 107374182400` value for subvolume creation equals 100 GiB in bytes, which is correct.
- The `ceph fs perf stats` command (the second metrics command) is valid and was introduced in Ceph Nautilus for per-client performance statistics.
- The `ceph fs set myfs max_mds 2` command for scaling active MDS count is correct.
- The Dashboard service name `rook-ceph-mgr-dashboard` and port 8443 are correct for standard Rook deployments.
- In newer Ceph versions (Quincy/Reef), the Dashboard may support setting directory quotas directly from the UI, which would make the "CLI is needed to set them" statement version-dependent. The CLI approach shown via subvolumes remains valid and is the recommended approach for multi-tenant quota management.
