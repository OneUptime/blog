# Validation Summary: How to Configure Dirty Ratios for Cache Tiering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (cache tiering subsystem)
- Rook (Ceph operator for Kubernetes, referenced in tags)
- Ceph CLI (`ceph osd pool`, `rados`)
- Ceph cache tier writeback mode

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph official documentation on pool settings: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CLI reference for `ceph osd pool set` and `ceph osd tier` commands
- Ceph source code for valid cache mode enumerations

## Issues Found

1. **Incorrect cache mode name "Writeproxy" in section title** (line 111)
   - **What was wrong:** The section title read "Readproxy/Writeproxy Modes". There is no `writeproxy` cache mode in Ceph. The valid cache modes are: `writeback`, `readforward`, `readonly`, `readproxy`, `proxy`, `forward`, and `none`.
   - **What was changed:** Renamed the section to "Readproxy/Proxy Modes" to correctly reference the actual Ceph cache modes.

2. **Invalid `ceph -W objecter` command** (line 164)
   - **What was wrong:** The command `ceph -W objecter` was presented as a way to watch for flush progress. The `-W` flag takes a log channel argument, and the valid channels are `cluster`, `audit`, and `debug` -- not `objecter`. This command would fail with an error.
   - **What was changed:** Removed the invalid `ceph -W objecter` line. The `rados -p fast-cache cache-flush-evict-all` command on the following line already performs the flush-and-evict operation and blocks until completion, making a separate watch command unnecessary.

## Review Notes
- Ceph cache tiering is officially deprecated since Ceph Nautilus (v14.x) and the documentation warns against using it in production. The post's technical content is accurate for the feature as it exists, but readers should be aware of the deprecation status.
- The `ceph osd pool create` commands use the older explicit pg_num/pgp_num syntax (e.g., `128 128`). In Ceph Nautilus and later, pgp_num is automatically set to match pg_num by the pg autoscaler, so the double specification is redundant but still valid.
- All dirty ratio parameters, default values, pool configuration commands, and the cache tier setup/teardown workflow are technically correct.
