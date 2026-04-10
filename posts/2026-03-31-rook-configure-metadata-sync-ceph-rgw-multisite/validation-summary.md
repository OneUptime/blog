# Validation Summary: How to Configure Metadata Sync in Ceph RGW Multisite

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Ceph RGW Multisite (zone/zonegroup architecture)
- radosgw-admin CLI
- Rook (mentioned in tags/context)
- Kubernetes (mentioned in tags/context)
- chrony / NTP time synchronization

## Sources Consulted
- Ceph Multi-Site documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- RADOS Gateway Data Layout: https://docs.ceph.com/en/latest/radosgw/layout/
- radosgw-admin man page (GitHub source): https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst
- Debian manpage for radosgw-admin: https://manpages.debian.org/testing/ceph-common/radosgw-admin.8.en.html

## Issues Found

1. **Incorrect metadata section names (plural vs singular):** The post listed metadata types as `users`, `buckets`, and `bucket.instance`. The official Ceph documentation uses singular names: `user`, `bucket`, and `bucket.instance`. These are the actual section names used by `radosgw-admin metadata list`. Changed to singular forms.

2. **Invalid `--shard-id` flag on `metadata sync status`:** The post used `radosgw-admin metadata sync status --shard-id=0` for shard-level inspection. The `--shard-id` flag is not documented for the `metadata sync status` subcommand. Replaced with `radosgw-admin mdlog list --shard-id=0`, which is the correct command for shard-level metadata log inspection and where `--shard-id` is explicitly documented.

3. **Invalid `--shard-id` flag on `metadata sync run`:** The post used `radosgw-admin metadata sync run --shard-id=5` to trigger sync for a specific shard. The `--shard-id` flag is not documented for `metadata sync run`. Removed the unsupported flag.

## Review Notes
- The `--secret` flag used in `user create` and `zone modify` commands is correct. It is an alias for `--secret-key` per the official man page.
- The description of metadata sync as "one-directional from master to all other zones" is a practical simplification. More precisely, metadata writes on non-master zones are forwarded to the master zone, which then syncs to secondaries. The blog's framing is acceptable for a guide.
- The `metadata sync run` command is valid but in normal operation metadata sync runs automatically via the radosgw daemon. The command is useful for troubleshooting stalled sync, which matches the blog's context of "forcing" sync.
- Newer Ceph versions have additional metadata sections beyond the three listed (e.g., `account`, `group`, `otp`, `roles`, `topic`), but the three listed are the core ones relevant to most multisite deployments.
