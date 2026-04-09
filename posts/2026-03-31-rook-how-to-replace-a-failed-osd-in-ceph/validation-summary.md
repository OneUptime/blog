# Validation Summary: How to Replace a Failed OSD in Ceph

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (storage cluster management)
- Rook (Ceph operator for Kubernetes)
- cephadm (Ceph deployment and orchestration tool)
- CRUSH map management
- OSD lifecycle management
- Linux system administration (systemctl, dmesg, journalctl, lsblk, sgdisk, wipefs)

## Sources Consulted
- Ceph official documentation: OSD management and troubleshooting (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- Ceph official documentation: cephadm OSD management (https://docs.ceph.com/en/latest/cephadm/services/osd/)
- Ceph CLI reference for `ceph config set` vs deprecated/invalid subcommands (https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/)
- Ceph official documentation: recovery configuration options (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)

## Issues Found
1. **Invalid command `ceph osd set-option`**: The "Adjusting Recovery Priority" section used `ceph osd set-option osd_recovery_op_priority` and `ceph osd set-option osd_recovery_max_active`. The subcommand `ceph osd set-option` does not exist in the Ceph CLI. Replaced all four occurrences with the correct command `ceph config set osd <option> <value>`, which is the standard way to set Ceph configuration options since Nautilus (v14.x).

## Review Notes
- The post correctly shows both the manual step-by-step OSD removal (crush remove, auth del, osd rm) and the combined `ceph osd purge` command. It would be worth noting that if using `purge`, the preceding manual steps are unnecessary (the post implies this with "Or use purge (combined)" but users could mistakenly run both).
- The `systemctl stop/disable ceph-osd@3` commands apply to traditional (non-containerized) Ceph deployments. For cephadm-managed clusters, the service unit name follows a different pattern (`ceph-<fsid>@osd.3.service`). The post partially addresses this by showing the cephadm workflow separately, but the systemctl section could confuse cephadm users.
- The default value of `osd_recovery_max_active` changed across Ceph releases (was 15 in older versions, 3 in Quincy+). The post's default of 3 is correct for current releases but may not apply to older clusters.
