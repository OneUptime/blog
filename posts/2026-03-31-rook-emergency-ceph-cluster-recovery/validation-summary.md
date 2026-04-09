# Validation Summary: How to Perform Emergency Ceph Cluster Recovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (MON, OSD, PG subsystems)
- Rook (Ceph operator for Kubernetes)
- systemd (service management for Ceph daemons)
- ceph-monstore-tool (MON store recovery utility)
- ceph-objectstore-tool (OSD store inspection utility)
- monmaptool (MON map manipulation utility)

## Sources Consulted
- [Troubleshooting Monitors - Ceph Documentation](https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/)
- [Adding/Removing Monitors - Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/)
- [Monitor Config Reference - Ceph Documentation](https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/)
- [ceph-monstore-tool man page](https://docs.ceph.com/en/latest/man/8/ceph-monstore-tool/)
- [ceph-mon man page](https://docs.ceph.com/en/latest/man/8/ceph-mon/)
- [Troubleshooting PGs - Ceph Documentation](https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-pg/)
- [Placement Groups - Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- [Monitoring a Cluster - Ceph Documentation](https://docs.ceph.com/en/reef/rados/operations/monitoring/)
- [Manual Deployment - Ceph Documentation](https://docs.ceph.com/en/latest/install/manual-deployment/)

## Issues Found
1. **MON quorum loss description was incorrect (line 30):** The post stated "If fewer than half the MONs are running, the cluster is read-only." This is wrong on two counts: (a) quorum requires a strict majority (more than half), not merely half; and (b) losing quorum makes the cluster **unavailable**, not read-only. Ceph uses Paxos consensus — without a majority of MONs, the MON service cannot process any requests. Changed to: "If a majority of MONs are not running, the cluster loses quorum and becomes unavailable."

2. **`ceph-monstore-tool rebuild` missing `--keyring` flag (line 42):** The command was shown as `ceph-monstore-tool /var/lib/ceph/mon/ceph-mon1 rebuild` but on any cephx-enabled cluster (the default), the `--keyring` flag is required for the rebuild to produce a functional monitor store. Added `-- --keyring /etc/ceph/ceph.client.admin.keyring`.

3. **`ceph-mon --mkfs` missing `--keyring` flag (line 49):** The command was shown as `ceph-mon --mkfs -i mon1 --monmap /tmp/monmap.bak` but the `--keyring` option is required to supply the monitor secret key. Without it, `mkfs` will fail or produce a monitor that cannot authenticate. Added `--keyring /tmp/ceph.mon.keyring`.

## Review Notes
- All other CLI commands (`ceph status`, `ceph health detail`, `ceph osd tree`, `ceph quorum_status`, `ceph mon stat`, `ceph osd dump`, `ceph pg dump_stuck`, `ceph pg force-recovery`, `ceph pg force-backfill`, `ceph osd set/unset` flags) were verified as correct.
- The `ceph-objectstore-tool` syntax for listing PGs on a BlueStore OSD is correct.
- The `systemctl` service naming conventions (`ceph-mon@`, `ceph-osd@`) are correct for systemd-managed Ceph deployments.
- The recovery priority order described in the summary (MON quorum first, OSD availability second, PG recovery third) is accurate best practice.
- The post title mentions Rook but the content covers bare-metal/systemd Ceph commands. In a Rook-managed cluster, the recovery approach would differ (e.g., using `kubectl` to manage pods rather than `systemctl`). This is not an error but could be clarified in a future revision.
