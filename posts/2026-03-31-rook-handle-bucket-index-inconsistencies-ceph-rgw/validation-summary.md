# Validation Summary: How to Handle Bucket Index Inconsistencies in Ceph RGW

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (RADOS Gateway / RGW)
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- RADOS (Reliable Autonomic Distributed Object Store)

## Sources Consulted
- radosgw-admin man page (Ceph latest): https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- radosgw-admin man page (Ceph Reef): https://docs.ceph.com/en/reef/man/8/radosgw-admin/
- radosgw-admin help output from Ceph source (help.t): https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t
- radosgw-admin.rst (Ceph source documentation): https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst
- Debian radosgw-admin man page: https://manpages.debian.org/experimental/ceph-common/radosgw-admin.8.en.html
- RADOS Gateway Data Layout: https://github.com/ceph/ceph/blob/main/doc/radosgw/layout.rst

## Issues Found

### Issue 1: `radosgw-admin bucket resync` does not exist (Step 3)
- **What was wrong:** The post used `radosgw-admin bucket resync --bucket my-bucket` as a command to rebuild the local bucket index. This command does not exist in radosgw-admin. It was likely confused with multi-site sync concepts.
- **What was changed:** Replaced with `radosgw-admin bucket check --check-objects --fix --bucket my-bucket`, which performs a deep check comparing the index against actual RADOS objects and repairs inconsistencies.
- **Why:** The `bucket resync` subcommand is not present in any version of radosgw-admin. Following this command would result in an error for readers.

### Issue 2: `radosgw-admin bucket sync run` does not exist (Step 3)
- **What was wrong:** The post used `radosgw-admin bucket sync run --bucket my-bucket` as a follow-up to `bi purge` for rebuilding the index. This command does not exist. The closest commands (`data sync run`, `bucket sync enable/disable`) are multi-site replication commands, not local index repair tools.
- **What was changed:** Replaced with `radosgw-admin bucket check --check-objects --fix --bucket my-bucket` after the `bi purge` step, which is the correct way to rebuild a purged bucket index.
- **Why:** Using non-existent commands in a troubleshooting guide could leave readers with a purged (empty) bucket index and no way to rebuild it.

### Issue 3: `--sync-stats` used with wrong command (Step 4)
- **What was wrong:** The post used `radosgw-admin bucket stats --bucket my-bucket --sync-stats`. The `--sync-stats` flag is documented for the `user stats` command, not `bucket stats`.
- **What was changed:** Split into two commands: `radosgw-admin bucket stats --bucket my-bucket` to verify bucket stats, followed by `radosgw-admin user stats --uid=<user> --sync-stats` to sync user-level usage statistics.
- **Why:** Using `--sync-stats` with `bucket stats` would either be silently ignored or produce an error, and the user-level stats would remain incorrect.

### Issue 4: Summary section updated
- **What was changed:** Updated the summary paragraph to reference the corrected commands (`bucket check --check-objects --fix` instead of the non-existent commands, and "sync user stats" instead of the incorrect `--sync-stats` usage).

## Review Notes
- The `radosgw-admin bucket check --uid=alice --fix` command in Step 2 is not explicitly documented in official docs, though `--uid` is a general option. Readers on older Ceph versions may need to list buckets with `radosgw-admin bucket list --uid=alice` and check each individually.
- The post mentions `.dir.<bucket-id>.0` in the RADOS inspection step. The marker used in index object names is typically the bucket instance marker (e.g., `default.14113.1`), not the bucket name. This is technically a bucket marker, not the bucket ID. The post's placeholder notation is acceptable but readers should be aware they need to use the marker from `radosgw-admin bucket stats`.
- For catastrophic bucket index loss beyond what `bi purge` + `bucket check --check-objects --fix` can handle, Ceph also provides the `rgw-restore-bucket-index` tool (available in newer versions). This could be mentioned in a future update.
