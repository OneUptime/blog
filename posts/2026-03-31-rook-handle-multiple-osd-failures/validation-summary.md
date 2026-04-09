# Validation Summary: How to Handle Multiple Simultaneous OSD Failures in Ceph

## Status
validated

## Post Type
Troubleshooting Guide / Operational Runbook

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)
- systemd (journalctl, systemctl)
- smartctl (disk health monitoring)

## Sources Consulted
- Ceph official documentation: Configuring Monitor/OSD Interaction (https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/) - verified `mon_osd_down_out_interval` default (600s), `osd_mon_report_interval` purpose, and OSD down-to-out timing chain
- Ceph official documentation: OSD management commands (https://docs.ceph.com/en/latest/rados/operations/control/) - verified `ceph osd set noout`, `ceph osd set norebalance`, `ceph osd purge`, `ceph osd out` syntax
- Ceph official documentation: Placement Group commands (https://docs.ceph.com/en/latest/rados/operations/placement-groups/) - verified `ceph pg ls` with state filters, `ceph pg stat`
- Rook documentation: OSD management (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/) - verified pod labels and OSD prepare job naming conventions

## Issues Found
1. **Incorrect config parameter explanation for OSD out timing**: The post stated that Ceph marks OSDs "out" after 10 minutes based on `osd_mon_report_interval` + `mon_osd_down_out_interval`. This is incorrect. The `osd_mon_report_interval` (default 5s) controls how frequently OSDs report status to monitors and is unrelated to the down-to-out timing. The down-to-out timer is controlled solely by `mon_osd_down_out_interval` (default 600s), which starts once the OSD is marked as down. Fixed the explanation to correctly reference only `mon_osd_down_out_interval = 600s`.

## Review Notes
- All `ceph` CLI commands (`ceph health detail`, `ceph -s`, `ceph osd tree`, `ceph osd stat`, `ceph osd set noout`, `ceph osd set norebalance`, `ceph osd dump`, `ceph pg ls`, `ceph pg stat`, `ceph osd out`, `ceph osd purge`, `ceph mon stat`, `ceph quorum_status`) are syntactically correct and use current flags.
- The risk tier analysis for replication 3 and erasure coding k=4,m=2 is accurate.
- The `systemctl` and `journalctl` commands use correct systemd unit naming for Ceph OSDs (`ceph-osd@<id>`).
- The Rook-specific kubectl commands use correct label selectors (`app=rook-ceph-osd,ceph-osd-id=<id>`) and OSD prepare job naming conventions.
- The `ceph osd purge` command correctly includes the `--yes-i-really-mean-it` safety flag.
- The overall recovery workflow (set noout, diagnose, recover, unset noout) follows Ceph best practices.
