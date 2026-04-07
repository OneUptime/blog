# Validation Summary: How to Send Remote Commands to MDS with ceph tell

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes Ceph operator)
- Ceph MDS (Metadata Server)
- CephFS
- `ceph tell` CLI command
- kubectl

## Sources Consulted
- Ceph official documentation on `ceph tell`: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph MDS administration documentation: https://docs.ceph.com/en/latest/cephfs/administration/
- Ceph MDS client eviction documentation: https://docs.ceph.com/en/latest/cephfs/eviction/
- Rook Ceph toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
- **Misleading section title and description for `dump_historic_ops`**: The section was titled "Dump MDS State" with the description "Get a full JSON dump of the MDS internal state for debugging." However, the command `dump_historic_ops` dumps recently completed operations (useful for diagnosing slow/stuck requests), not the full MDS internal state. Changed the title to "Dump Historic Operations" and the description to "List recently completed operations for debugging slow or stuck requests."

## Review Notes
- All other commands (`flush journal`, `perf dump`, `client evict`, `session ls`, `config set`, `help`) are correct and use proper syntax.
- The `ceph tell mds.<fsname>:<rank>` addressing format is correct for modern Ceph versions.
- The wildcard `mds.*` syntax for broadcasting to all MDS daemons is correct.
- The `mds_cache_memory_limit` configuration option and its value (4294967296 = 4 GiB) are valid.
- The `jq` piping example works correctly since kubectl output goes to stdout on the client side.
