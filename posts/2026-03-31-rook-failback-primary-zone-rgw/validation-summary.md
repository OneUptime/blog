# Validation Summary: How to Failback to Primary Zone in Ceph RGW

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Ceph (RADOS Gateway / RGW)
- Ceph RGW Multisite (zones, zonegroups, realms, periods)
- radosgw-admin CLI
- Rook Ceph Operator (Kubernetes)
- AWS CLI (Route 53 DNS, S3-compatible operations)
- systemctl (systemd service management)

## Sources Consulted
- [Ceph Multi-Site Documentation](https://docs.ceph.com/en/latest/radosgw/multisite/) — authoritative source for multisite failover/failback procedures
- [radosgw-admin man page (Ceph main branch)](https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst) — verified valid subcommands for sync, period, and zone operations
- [radosgw-admin man page (Debian/bookworm)](https://manpages.debian.org/bookworm/ceph-common/radosgw-admin.8.en.html) — cross-referenced available sync subcommands
- [Rook Object Storage Documentation](https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/) — verified pod labels for RGW pods
- [Rook RGW source (rgw.go)](https://github.com/rook/rook/blob/master/pkg/operator/ceph/object/rgw.go) — confirmed `rgw=<name>` label is applied to RGW pods
- [Ceph Bug #15901](https://tracker.ceph.com/issues/15901) — confirmed that `zone modify` without `--master` unreliably clears master status (bug, not feature)

## Issues Found

1. **Invalid command `radosgw-admin sync run` (Step 2):** There is no `sync run` subcommand in radosgw-admin. The valid sync subcommands are `data sync run`, `metadata sync run`, `sync status`, `data sync status`, etc. In practice, sync begins automatically when the RGW daemon is running with the correct period configuration. **Fixed** by replacing `radosgw-admin sync run` with restarting the RGW daemon after pulling the period, which is the standard approach for initiating sync after a period change.

2. **Missing RGW restart on primary after promotion (Step 4):** After promoting the primary back to master with `zone modify --master` and `period update --commit`, the RGW daemon on the primary must be restarted to apply the new period configuration. The official Ceph multisite documentation explicitly states that RGW daemons need to be restarted after zone/period changes. **Fixed** by adding `systemctl restart ceph-radosgw@rgw.us-east` after the period commit.

3. **Unreliable secondary demotion approach (Step 5):** The original Step 5 used `radosgw-admin zone modify --rgw-zone=us-west` (without `--master`) to "remove" the master flag, followed by `period update --commit` on the secondary. This is problematic for two reasons: (a) `zone modify` without `--master` does not reliably unset master status — this behavior (tracked in Ceph bug #15901) is a bug, not a documented feature; (b) running `period update --commit` on a non-master zone after the primary has already been promoted is unnecessary and may fail. Demotion is implicit — when the primary is promoted to master via period update, the secondary is automatically non-master. **Fixed** by replacing the unreliable demotion commands with `radosgw-admin period pull` from the new master (primary), followed by an RGW restart. This is the correct procedure: the secondary pulls the updated period reflecting the new master designation and restarts to apply it.

## Review Notes
- The `period update --commit` in Step 4 is run on the primary zone, which has just been designated as master via `zone modify --master`. This works because the zone is self-declaring as master and committing the period. In some Ceph versions, if the commit needs to be forwarded to the current master (secondary), it may require `--url` and credential flags. The current approach works in most configurations where the primary can reach the secondary's RGW endpoint via the URL stored in the period configuration.
- The post could benefit from mentioning Rook-specific commands for steps that use `systemctl` (e.g., restarting RGW in a Rook deployment is handled by the operator, not by systemctl). Step 1 already mentions Rook as an alternative but subsequent steps do not.
- The `ceph daemon rgw.us-east perf dump` command in Post-Failback Checks uses a daemon admin socket name that may vary by deployment — in containerized/Rook deployments, the admin socket path and name differ. This is a minor caveat, not an error.
