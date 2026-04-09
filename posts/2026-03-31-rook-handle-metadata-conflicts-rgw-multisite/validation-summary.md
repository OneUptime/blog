# Validation Summary: How to Handle Metadata Conflicts in Ceph RGW Multisite

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite replication
- radosgw-admin CLI
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- radosgw-admin man page — https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- radosgw-admin man page source (GitHub) — https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst
- radosgw-admin help test file (GitHub) — https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t
- Ceph Multi-Site documentation — https://docs.ceph.com/en/latest/radosgw/multisite/
- RGW Dynamic Bucket Index Resharding — https://docs.ceph.com/en/latest/radosgw/dynamicresharding/

## Issues Found

1. **Invalid metadata log commands** (Detecting Metadata Conflicts section): `radosgw-admin log list --log-type=metadata` and `radosgw-admin log show --log-type=metadata --id=<log-id>` are not valid. The `log list` and `log show` subcommands are for usage logs, not metadata sync logs. The `--log-type` flag accepts storage backend values (`fifo`, `omap`), not `metadata`. **Fixed to:** `radosgw-admin mdlog list --shard-id=0` and `radosgw-admin mdlog status`, which are the correct commands for inspecting metadata log entries.

2. **Misleading `--rgw-zone` with `bucket stats`** (Comparing Metadata Between Zones section): The post used `radosgw-admin bucket stats --bucket=mybucket --rgw-zone=us-east` implying it queries a remote zone's data. In reality, `--rgw-zone` only sets the local zone configuration context — `radosgw-admin` always operates against the local RADOS cluster and cannot reach across the network to query another zone. **Fixed to:** Use `radosgw-admin metadata get bucket:mybucket` run from each zone's host separately, with a clarifying comment.

3. **Same `--rgw-zone` issue in Resolving section**: Removed `--rgw-zone=us-east` from `bucket stats` in the resolution section and clarified the command should be run on the authoritative zone's host.

4. **Invalid `bucket sync run` subcommand** (Resolving Bucket Metadata Conflicts section): `radosgw-admin bucket sync run` does not exist. Valid `bucket sync` subcommands are `checkpoint`, `disable`, `enable`, and `status`. **Fixed to:** `radosgw-admin bucket sync status --bucket=mybucket` with a comment noting that sync propagates automatically via the RGW daemon after metadata is updated.

5. **Wrong tool for index corruption recovery** (Rebuilding Bucket Index section): `radosgw-admin bucket reshard` changes the number of index shards — it does not rebuild a corrupted index and could make corruption worse. **Fixed to:** `radosgw-admin bucket check --bucket=mybucket --check-objects --fix`, which rebuilds the bucket index from actual object state in the OSDs, followed by a verification step.

## Review Notes
- The `metadata sync init` and `metadata sync run` commands in the "Re-Syncing All Metadata" section are valid subcommands, though `--source-zone` is documented primarily for data sync. Metadata sync typically pulls from the zonegroup master zone automatically. These were left as-is since they are valid commands and the usage is reasonable in a recovery context.
- The `metadata sync init` command resets all sync state and triggers a full re-sync. The post could benefit from a warning that this is a heavyweight operation, but this is a style suggestion rather than a technical error.
- The post's overall approach to metadata conflict resolution (get/put metadata, then verify sync) is sound and follows established Ceph operational practices.
