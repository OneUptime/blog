# Validation Summary: How to Handle Bucket Resharding in Multisite Ceph RGW

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph multisite replication
- radosgw-admin CLI
- Ceph dynamic bucket index resharding
- Rook (mentioned in tags/context)
- Kubernetes (mentioned in tags/context)

## Sources Consulted
- radosgw-admin man page (official Ceph docs): https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph radosgw-admin source (help.t test file): https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t
- Ceph RGW Dynamic Bucket Index Resharding docs: https://docs.ceph.com/en/latest/radosgw/dynamicresharding/
- Ceph radosgw-admin man page source: https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst

## Issues Found

### 1. Misleading comment on manual reshard command
- **What was wrong:** The comment above `radosgw-admin bucket reshard` said "Check current index status" but the command actually performs an immediate inline resharding operation that blocks bucket I/O.
- **What was changed:** Updated the comment to "Perform immediate inline resharding (blocks bucket I/O)" to accurately describe the command's behavior.

### 2. Invalid `bucket sync init` and `bucket sync run` subcommands
- **What was wrong:** The post used `radosgw-admin bucket sync init` and `radosgw-admin bucket sync run` to reinitialize stuck bucket sync. These are not valid `radosgw-admin` subcommands. The valid `bucket sync` subcommands are: `status`, `disable`, `enable`, and `checkpoint`.
- **What was changed:** Replaced with `radosgw-admin bucket sync disable --bucket=my-large-bucket` followed by `radosgw-admin bucket sync enable --bucket=my-large-bucket`, which is the documented approach to reinitialize bucket sync.

### 3. Invalid `data sync pause` and `data sync resume` subcommands
- **What was wrong:** The post used `radosgw-admin data sync pause --source-zone=zone1` and `radosgw-admin data sync resume --source-zone=zone1` to pause/resume sync during resharding. These are not valid `radosgw-admin` subcommands. The valid `data sync` subcommands are: `status`, `init`, and `run`.
- **What was changed:** Replaced with per-bucket `bucket sync disable` / `bucket sync enable` commands, which provides a more targeted approach (only affects the bucket being resharded rather than all data sync) and uses valid, documented commands.

## Review Notes
- The `--yes-i-really-mean-it` flag on `bucket reshard` is used in some Ceph versions for confirmation of disruptive operations. Its requirement may vary by Ceph release.
- The post correctly distinguishes between immediate resharding (`bucket reshard`) and queue-based online resharding (`reshard add` / `reshard process`).
- The `rgw_dynamic_resharding`, `rgw_max_objs_per_shard`, and `rgw_reshard_thread_interval` config option names are all verified correct against official Ceph documentation.
- The Python snippet for parsing `bucket stats` output uses the correct JSON field paths (`num_shards` and `usage.rgw.main.num_objects`).
