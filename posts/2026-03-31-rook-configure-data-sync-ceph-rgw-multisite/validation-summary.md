# Validation Summary: How to Configure Data Sync in Ceph RGW Multisite

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite (zone-based replication)
- radosgw-admin CLI
- Ceph configuration system (ceph.conf / ceph config set)
- Prometheus metrics via Ceph MGR module
- Kubernetes (Rook context, mentioned in tags)

## Sources Consulted
- Ceph Multi-Site Documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph RGW Config Reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph rgw.yaml.in (config option definitions): https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- radosgw-admin CLI subcommand list: https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t
- Ceph MGR Prometheus Module: https://docs.ceph.com/en/latest/mgr/prometheus/

## Issues Found

1. **Incorrect endpoint URL in zone modify command**: The `--endpoints` flag in `radosgw-admin zone modify --rgw-zone=zone2` was set to `http://zone1-rgw.example.com` (the source zone's URL). The `--endpoints` flag sets the zone's OWN endpoint, so it should be `http://zone2-rgw.example.com`. The explanatory text was also updated from "source zone endpoint" to "its own endpoint." Fixed.

2. **Non-existent config option `rgw_data_sync_concurrency`**: This is not a valid Ceph configuration option. The correct option is `rgw_data_sync_spawn_window`, which controls the maximum number of items data sync processes in parallel per remote datalog shard. Fixed in both the ceph.conf example and the `ceph config set` command.

3. **Invalid `bucket sync init` subcommand**: `radosgw-admin bucket sync init` is not a valid CLI subcommand. The documented approach to force a full bucket resync is to disable and re-enable sync with `bucket sync disable` followed by `bucket sync enable`. Fixed.

4. **Incorrect metrics endpoint path**: Ceph RGW does not expose a `/admin/metrics` HTTP endpoint. RGW metrics are exposed through the Ceph MGR Prometheus module at `http://<mgr-host>:9283/metrics`. Updated the command and explanatory text accordingly.

## Review Notes
- The `radosgw-admin sync error trim --start-date=2026-01-01` command is syntactically valid but could be more complete. In practice, specifying `--end-date` and potentially `--rgw-zone` would make the command more predictable. Left as-is since it is not strictly incorrect.
- The post tags mention Rook and Kubernetes but the content is purely about Ceph RGW multisite at the CLI/config level with no Rook-specific configuration (CephObjectStore CRDs, etc.). This is not an error but readers expecting Rook-specific guidance may need to adapt the commands to their Rook-managed environment.
