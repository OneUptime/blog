# Validation Summary: How to Migrate Ceph from On-Premise to Cloud

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (RGW, RBD, CephFS)
- Rook
- radosgw-admin (RGW multi-site sync)
- rclone (S3-to-S3 sync)
- rsync (filesystem migration)
- AWS S3 CLI
- RBD export/import and export-diff

## Sources Consulted
- Ceph official documentation: RGW Multi-Site (https://docs.ceph.com/en/latest/radosgw/multisite/)
- Ceph official documentation: RBD commands (https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/)
- Ceph official documentation: cephfs-data-scan (https://docs.ceph.com/en/latest/cephfs/disaster-recovery/)
- Ceph official documentation: cephfs-mirror (https://docs.ceph.com/en/latest/cephfs/cephfs-mirroring/)
- rclone official documentation: S3 backend flags (https://rclone.org/s3/)
- rclone official documentation: backend flags behavior (https://rclone.org/docs/#backend-flags)
- radosgw-admin official documentation: bucket stats (https://docs.ceph.com/en/latest/radosgw/admin/)

## Issues Found

### Issue 1: Incorrect rclone S3 credential flags
- **What was wrong:** The `rclone sync` command used `--s3-access-key-id` and `--s3-secret-access-key` as command-line flags. These are backend-type flags that apply to ALL S3 remotes in the command. Since both the source (`ceph-s3`) and destination (`aws-s3`) are S3 backends, these flags would override the credentials for both remotes, breaking the source Ceph connection.
- **What was changed:** Removed the `--s3-access-key-id`, `--s3-secret-access-key`, and `--s3-region` flags from the command line. Added comments clarifying that credentials should be configured per-remote during `rclone config`.
- **Why:** rclone credentials must be set per-remote in the configuration file (or via remote-specific environment variables) when using multiple S3-type remotes in the same command.

### Issue 2: Incorrect recommendation of cephfs-data-scan for migration
- **What was wrong:** The post recommended `cephfs-data-scan scan_extents` for migrating large CephFS datasets. `cephfs-data-scan` is a disaster recovery tool used to rebuild CephFS metadata from data pool objects. It does not transfer or migrate data.
- **What was changed:** Replaced the `cephfs-data-scan` suggestion with parallel rsync workers and a mention of the `cephfs-mirror` daemon for continuous CephFS replication.
- **Why:** `cephfs-data-scan` is documented under Ceph's disaster recovery section and has no migration functionality. Parallel rsync and cephfs-mirror are the correct tools for large-scale CephFS data migration.

### Issue 3: Incorrect command for verifying RGW bucket stats
- **What was wrong:** The post used `ceph df | grep mybucket` to verify object counts after migration. `ceph df` reports pool-level usage, not RGW bucket-level statistics. Bucket names do not appear in `ceph df` output.
- **What was changed:** Replaced `ceph df | grep mybucket` with `radosgw-admin bucket stats --bucket=mybucket`.
- **Why:** `radosgw-admin bucket stats` is the correct command to retrieve per-bucket object counts and size information from the RGW.

## Review Notes
- The RGW multi-site sync section is a simplified overview. A production migration would also need to configure zones, zonegroups, and period updates. The post's scope is appropriate for an introductory guide but readers should consult the full multi-site documentation.
- The RBD export/import approach works but can be slow for very large volumes. For production migrations, `rbd migration` (available since Ceph Nautilus) provides a more seamless live migration path and could be mentioned in future updates.
- The post title says "Rook" in the tags but does not cover any Rook-specific migration steps. The commands shown are standard Ceph CLI commands that work regardless of whether Rook is the deployment method.
