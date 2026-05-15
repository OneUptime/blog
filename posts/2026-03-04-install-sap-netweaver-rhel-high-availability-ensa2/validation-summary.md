# Validation Summary: How to Install SAP NetWeaver on RHEL with High Availability (ENSA2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux for SAP Solutions
- SAP NetWeaver / SAP application server instances
- Standalone Enqueue Server 2 (ENSA2)
- ASCS and ERS high availability
- Pacemaker and pcs
- SAPInstance resource agent
- NFS shared filesystems

## Sources Consulted
- Red Hat Enterprise Linux for SAP Solutions 9: Deploying SAP NetWeaver or S/4HANA Application Server High Availability with simple mount, Chapter 3 and Chapter 5: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/deploying_sap_netweaver_or_s4hana_application_server_high_availability_with_simple_mount/
- Red Hat Enterprise Linux for SAP Solutions 9: Configuring HA clusters to manage SAP NetWeaver or SAP S/4HANA Application server instances using the RHEL HA Add-On, Chapter 4: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/configuring_ha_clusters_to_manage_sap_netweaver_or_sap_s4hana_application_server_instances_using_the_rhel_ha_add-on/
- Red Hat Enterprise Linux for SAP Solutions 9: Installing RHEL 9 for SAP Solutions, RHEL System Roles for SAP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/
- Red Hat Customer Portal: RHEL 7.6+ Guidelines for Configuring SAP S/4HANA ASCS/ERS with Standalone Enqueue Server 2 (ENSA2) in Pacemaker: https://access.redhat.com/articles/3974941

## Issues Found
- The SAP preparation package command installed only `rhel-system-roles-sap`. Red Hat documents installing `ansible-core`, `rhel-system-roles-sap`, and `rhel-system-roles` for RHEL System Roles for SAP usage. Updated the command accordingly.
- The shared filesystem text incorrectly implied ENSA2 itself requires the shared filesystems. Updated it to state that SAP HA setups require shared filesystems, and changed the NFS entries to `nfs4` with directory creation and `systemctl daemon-reload`, matching Red Hat examples.
- The Pacemaker setup omitted starting `pcsd` before node authentication. Added `systemctl enable --now pcsd.service`.
- The cluster setup command used a two-step setup/start flow while current Red Hat docs show `pcs cluster setup <cluster_name> --start <node1> <node2>`. Updated the command.
- The post instructed disabling STONITH. Red Hat support guidance requires proper working fencing for HA clusters, so this was replaced with a note to configure and test fencing before production resources are added.
- The Filesystem resources for ASCS and ERS were missing `force_unmount=safe` and Red Hat-recommended operation timeouts. Added those parameters.
- The SAPInstance resources used `AUTOMATIC_RECOVER=true`, which differs from Red Hat ASCS/ERS examples using `AUTOMATIC_RECOVER=false`. Updated both ASCS and ERS resources and added operation timeouts.
- The ASCS SAPInstance resource and group were missing the resource stickiness settings used to balance the ASCS/ERS anti-colocation behavior. Added `meta resource-stickiness=5000` and group `resource-stickiness=3000`.
- The ASCS/ERS order constraint omitted `kind=Optional`. Added it to match Red Hat guidance.

## Review Notes
The post remains a concise example, not a complete production SAP HA runbook. Future improvements could include explicit repository enablement, firewall setup, virtual hostname/IP preparation, SAP profile changes, SAP HA interface setup, resource defaults, and platform-specific fencing examples.
