# Validation Summary: How to Configure Multisite Sync Policy in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- radosgw-admin CLI
- Ceph Multisite Sync Policies
- Rook (mentioned in tags, not directly in content)

## Sources Consulted
- Ceph Official Documentation - Multisite Sync Policy: https://docs.ceph.com/en/reef/radosgw/multisite-sync-policy/
- Ceph GitHub - multisite-sync-policy.rst: https://github.com/ceph/ceph/blob/main/doc/radosgw/multisite-sync-policy.rst
- Ceph GitHub - radosgw-admin man page: https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst
- Ceph GitHub - radosgw-admin help.t: https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t
- Ceph Blog - Multisite Replication Part 5: https://ceph.io/en/news/blog/2025/rgw-multisite-replication_part5/
- Ceph Blog - Multisite Replication Part 6: https://ceph.io/en/news/blog/2025/rgw-multisite-replication_part6/

## Issues Found

1. **`--bucket-name` flag does not exist; corrected to `--bucket`** (3 occurrences). The `radosgw-admin` CLI uses `--bucket` throughout. `--bucket-name` is not a recognized flag and would cause a command error. Fixed in the `sync policy get`, `sync group create`, and `sync group flow create` commands.

2. **`--source-tags` flag does not exist; corrected to `--tags-add`**. The correct flag for filtering sync pipes by object tags is `--tags-add`, not `--source-tags`. The original command would fail.

3. **`radosgw-admin log show --log-type=data --bucket mybucket` is invalid**. The `--log-type` flag does not exist for the `log show` subcommand. Replaced with `radosgw-admin sync status`, which is the correct command for monitoring multisite sync status.

4. **Definitions of Pipes and Flows were swapped**. The original post described Pipes as "define data flow between zones" and Flows as "specify which zones participate in sync." In reality, Flows define data movement patterns between zones, while Pipes specify which buckets participate and their filtering criteria. Corrected the descriptions.

5. **"Tag-based policy" was misleadingly described as a third hierarchy level**. Tags are actually a pipe-level filter parameter (via `--tags-add`), not a separate tier in the sync policy hierarchy. Corrected to "Pipe-level filters" to accurately reflect the architecture.

## Review Notes
- The official Ceph documentation recommends creating sync groups with `--status=allowed` first, then changing to `--status=enabled` via `sync group modify` after all flows and pipes are configured. The blog post creates groups directly with `--status=enabled`, which works but is not the recommended practice.
- `radosgw-admin period update --commit` is required after zone group-level policy changes but is not strictly necessary after bucket-level policy changes. The blog post applies it after bucket-level changes as well, which is harmless but unnecessary.
- The `bucket sync status` command used in the post is valid and works in practice, though it is notably absent from the official radosgw-admin man page (the man page is incomplete in this regard).
