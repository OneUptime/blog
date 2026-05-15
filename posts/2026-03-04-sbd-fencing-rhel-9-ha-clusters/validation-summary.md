# Validation Summary: How to Configure SBD Fencing for RHEL HA Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9 High Availability Add-On
- Pacemaker
- pcs
- SBD
- STONITH/fencing
- Linux watchdog devices
- Shared block storage

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing high availability clusters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/
- Red Hat Enterprise Linux 9 documentation: Configuring a high-availability cluster by using RHEL system roles, SBD node fencing sections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-a-high-availability-cluster-by-using-the-ha-cluster-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- sbd(8) man page: https://www.mankier.com/8/sbd
- pcs(8) man page: https://www.mankier.com/8/pcs
- fence_sbd(8) man page: https://www.mankier.com/8/fence_sbd

## Issues Found
- The `pcs cluster setup ... --watchdog /dev/watchdog` command was not valid for creating a cluster with SBD. Changed it to create the cluster with `pcs cluster setup`, then enable SBD with `pcs stonith sbd enable watchdog=/dev/watchdog device=/dev/sdc SBD_WATCHDOG_TIMEOUT=5`.
- The existing-cluster example set `stonith-watchdog-timeout`, which Red Hat documents as needed only for watchdog-only SBD fencing. Changed it to set `stonith-timeout=20s` for shared-storage SBD.
- The verification commands used `sbd ... message node1` and `sbd ... message node2` without a message type. Removed those commands and kept `sbd ... list` as the message-slot verification command.
- The testing section said an SBD `test` message fences the target node. Corrected it to state that `test` only logs a message on the target and should not be used during production.
- The multiple-device explanation said one of two devices is enough for fencing. Corrected it to match SBD behavior: two-device setups can continue after losing one device but cannot safely fence while only one remains available; three-device setups can relay fencing messages if at least two devices remain accessible.
- The shared-device example used `/dev/sdc` without warning that kernel-assigned names can change. Added a note to prefer stable `/dev/disk/by-id/...` paths in production.

## Review Notes
The post is technically relevant and remains a useful RHEL HA SBD guide after the corrections. Future improvements could include showing the modern `pcs stonith sbd device setup` workflow and adding a note that SBD device paths can differ per node when configured through `pcs stonith sbd enable`.
