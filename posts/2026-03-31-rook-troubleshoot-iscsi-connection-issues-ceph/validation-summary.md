# Validation Summary: How to Troubleshoot iSCSI Connection Issues with Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph iSCSI Gateway (rbd-target-gw, rbd-target-api)
- open-iscsi (iscsiadm)
- LIO (Linux-IO Target)
- gwcli (Ceph iSCSI Gateway CLI)
- targetcli
- firewalld / iptables

## Sources Consulted
- Ceph iSCSI Gateway documentation: https://docs.ceph.com/en/latest/rbd/iscsi-overview/
- open-iscsi iscsiadm man page: https://linux.die.net/man/8/iscsiadm
- LIO Target documentation: https://linux-iscsi.org/wiki/Main_Page
- firewalld documentation: https://firewalld.org/documentation/

## Issues Found
No technical issues found.

## Review Notes
- All `iscsiadm` commands use correct flags and parameter names.
- The iSCSI timeout parameters (`noop_out_interval`, `noop_out_timeout`, `replacement_timeout`) are valid and the suggested values are reasonable defaults for improving session stability.
- The Ceph iSCSI gateway service names (`rbd-target-gw`, `rbd-target-api`) and config file path (`/etc/ceph/iscsi-gateway.cfg`) are accurate.
- The `gwcli` navigation paths and host/LUN management commands reflect the correct workflow for Ceph iSCSI gateway administration.
- Note: Ceph iSCSI gateway support has been deprecated in recent Ceph releases (Reef and later). Users on newer Ceph versions should be aware that this feature may not be available or supported.
