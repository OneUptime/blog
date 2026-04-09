# Validation Summary: How to Failover to Secondary Zone in Ceph RGW

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph multisite replication
- radosgw-admin CLI
- Rook Ceph operator (Kubernetes)
- AWS CLI (Route 53, S3)
- systemctl / journalctl

## Sources Consulted
- Ceph official multisite documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph orphan list tooling docs: https://docs.ceph.com/en/reef/radosgw/orphans/
- rgw-orphan-list man page: https://docs.ceph.com/en/latest/man/8/rgw-orphan-list/
- Rook object store source code (labeling): https://github.com/rook/rook/blob/master/pkg/operator/ceph/object/objectstore.go

## Issues Found

1. **Redundant `period pull` after `period update --commit` on the same zone (line 46):** The planned failover section ran `radosgw-admin period pull` on the secondary zone immediately after running `period update --commit` on that same zone. This is redundant — the zone that committed the period already has it. `period pull` is meant for other zones to fetch the updated period. Removed the unnecessary command.

2. **Invalid `--rgw-zone` flag on `period update` (line 56):** The emergency failover section used `radosgw-admin period update --commit --rgw-zone=us-west`. The `--rgw-zone` flag is not a documented option for the `period update` subcommand. The zone context is already set by the preceding `zone modify` command. Removed the `--rgw-zone=us-west` flag.

3. **Invalid `radosgw-admin log list --log-type=data` command (line 102):** The `log list` subcommand does not accept a `--log-type` flag. For inspecting multisite data replication logs, the correct command is `radosgw-admin datalog list`. Fixed to use the correct command.

4. **Deprecated `radosgw-admin orphans find` command (line 118):** The `orphans find` subcommand is explicitly deprecated in current Ceph releases (Pacific and later). It has been replaced by the `rgw-orphan-list` tool, which stores intermediate results locally instead of on the cluster. Updated to use `rgw-orphan-list`.

5. **Summary referenced `--force` options not used in the post (line 123):** The summary paragraph mentioned using `--force` options for emergency failovers, but no `--force` flag was actually used in any of the commands in the post. Removed the misleading reference.

## Review Notes
- The post could benefit from mentioning `--default` in addition to `--master` when promoting a zone, as official Ceph docs commonly show `radosgw-admin zone modify --rgw-zone=<name> --master --default` for failover scenarios.
- The `rgw-orphan-list` tool is noted as "experimental" in official docs — results should be sanity-checked before acting on them.
- For the Rook kubectl command, both `rgw=<store-name>` and `rook_object_store=<store-name>` labels exist on RGW pods; the usage shown is valid.
