# Validation Summary: How to Handle Split-Brain in Ceph RGW Multisite

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite Replication
- radosgw-admin CLI
- AWS CLI (for S3-compatible operations)
- systemd (for service management)

## Sources Consulted
- [radosgw-admin man page](https://docs.ceph.com/en/latest/man/8/radosgw-admin/) — verified command syntax, subcommands, and flags
- [Ceph Multi-Site documentation](https://docs.ceph.com/en/latest/radosgw/multisite/) — verified multisite architecture, zone/zonegroup concepts, and failover procedures
- [Ceph source: rgw_zone.cc](https://github.com/ceph/ceph/blob/main/src/rgw/rgw_zone.cc) — verified RGWZoneParams struct fields (no `is_master` field)
- [radosgw-admin help.t (source test)](https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t) — verified available subcommands
- [Ceph Cloud Transition docs](https://docs.ceph.com/en/latest/radosgw/cloud-transition/) — verified tier-config key names
- [Red Hat Ceph Storage 7 Object Gateway Guide](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/7/html/object_gateway_guide/multisite-configuration-and-administration) — cross-referenced multisite commands

## Issues Found

1. **`radosgw-admin zone get` does not have an `is_master` field.** The `is_master` / `master_zone` information lives at the zonegroup level, not the zone level. Changed `zone get --rgw-zone=<zone> | grep '"is_master"'` to `zonegroup get | grep '"master_zone"'` on both zones, with an updated comment explaining how to detect split-brain from differing master_zone IDs.

2. **`radosgw-admin log list --log-type=data` is not a valid command.** The `--log-type` flag does not exist for `log list`. Changed to `radosgw-admin datalog list`, which is the correct command for listing data log entries used by multisite sync.

3. **`radosgw-admin object stat --rgw-zone=<remote-zone>` cannot query remote zones.** The `--rgw-zone` flag sets the local zone context but does not allow querying objects on a remote cluster. Removed the `--rgw-zone` flags and added comments clarifying each command must be run directly on its respective zone.

4. **`radosgw-admin metadata sync run --source-zone=<zone>` uses an invalid flag.** While `metadata sync run` is a valid command, it does not accept `--source-zone` — metadata sync pulls from the master zone implicitly. Changed to `radosgw-admin metadata sync init` which re-initializes metadata sync state from the master zone, which is the correct operation for post-split-brain recovery.

5. **`radosgw-admin bucket sync run` is not a documented command.** The documented bucket sync subcommands are `disable`, `enable`, and `checkpoint`. Changed to a `bucket sync disable` followed by `bucket sync enable` cycle, which resets bucket sync state and triggers a fresh sync.

6. **Data reconciliation script had wrong awk field number.** The `diff` output prefixes lines with `> `, shifting all field positions by one. `awk '{print $4}'` extracted the file size instead of the object key. Fixed to `awk '{print $5}'`.

7. **`--tier-config=write-quorum=2` is a fabricated option.** The `--tier-config` flag exists but `write-quorum` is not a real tier-config key. Ceph RGW has no built-in write quorum mechanism. Replaced the entire "Preventing Future Split-Brain" section with real commands: `zone modify --sync-from-all` for ensuring zones sync from peers, `zone modify --master --default` with `period update --commit` for confirming correct master designation, and `sync status` for monitoring.

8. **`rgw_zone_sync_period_hours` is a fabricated config option.** This option does not exist in Ceph. RGW multisite sync is event-driven (based on data/metadata logs), not periodic. Removed this command.

9. **`ceph config set client.rgw sync_from_all` is the wrong approach.** The `sync_from_all` property is a zone-level setting configured via `radosgw-admin zone modify --sync-from-all`, not via `ceph config set`. Replaced with the correct `radosgw-admin zone modify` command.

## Review Notes
- The Summary section mentions "short DNS TTLs" as a prevention measure, but DNS TTLs are not discussed anywhere in the body of the post. This is not technically incorrect (DNS TTLs are relevant to client failover) but is somewhat disconnected from the content.
- The post correctly identifies the general split-brain resolution strategy (designate one zone as authoritative, extract unique data, resync). This is the recommended approach per Ceph documentation.
- The `systemctl stop ceph-radosgw@rgw.us-west` service name format is deployment-dependent (varies between cephadm, manual, and Rook deployments) but is acceptable as a representative example.
- Prevention of split-brain in Ceph RGW multisite is primarily procedural (coordinated failover, avoiding automated promotion without confirming primary is down) rather than configuration-based. The post could benefit from emphasizing this in future revisions.
