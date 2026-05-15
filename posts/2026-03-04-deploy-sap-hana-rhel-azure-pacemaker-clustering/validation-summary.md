# Validation Summary: How to Deploy SAP HANA on RHEL in Azure with Pacemaker Clustering

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SAP HANA System Replication
- Pacemaker and pcs
- Azure Virtual Machines
- Azure Load Balancer
- Azure fencing with `fence_azure_arm`
- SAP HANA cluster resource agents

## Sources Consulted
- Microsoft Learn: Set up Pacemaker on Red Hat Enterprise Linux in Azure: https://learn.microsoft.com/en-us/azure/sap/workloads/high-availability-guide-rhel-pacemaker
- Microsoft Learn: High availability of SAP HANA on Azure VMs on RHEL: https://learn.microsoft.com/en-us/azure/sap/workloads/sap-hana-high-availability-rhel
- Red Hat Documentation: Deploying SAP HANA Scale-Up System Replication High Availability, RHEL for SAP Solutions 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/deploying_sap_hana_scale-up_system_replication_high_availability/deploying_sap_hana_scale-up_system_replication_high_availability
- Red Hat Documentation: Planning the HA cluster setup for SAP HANA HA on RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/deploying_sap_hana_scale-up_system_replication_high_availability/asmb_planning_v9-deploying-scale-up-system-replication

## Issues Found
- The package list omitted `resource-agents-cloud`, which Microsoft documents for RHEL 9 cloud resource agents and which provides the Azure load balancer resource agent. Added it to the installation command.
- The cluster setup commands skipped starting `pcsd`, setting the `hacluster` password, and authenticating hosts with `pcs host auth`, which are required before `pcs cluster setup` on current RHEL 8/9 examples. Added those commands.
- The Azure fence agent example used `plug` and `pcmk_reboot_action`, while Microsoft's current RHEL 8/9 Azure guidance uses `pcmk_reboot_timeout`, `pcmk_monitor_timeout`, `pcmk_action_limit`, and `meta failure-timeout`. Updated the example to match the documented managed identity fencing command.
- The Azure load balancer group placed the VIP before the `azure-lb` health probe resource. Updated the group order to place the health probe first, matching Microsoft SAP HANA on Azure examples.
- The SAPHana resource lacked the RHEL 8/9 monitor role operations and used `AUTOMATED_REGISTER=true` for initial failover testing. Added Primary/Secondary monitor operations, promote/demote timeouts, and changed the initial value to `AUTOMATED_REGISTER=false`, which Microsoft recommends during failover tests.
- The colocation and ordering constraints used `Promoted` with the legacy `SAPHana` resource. For the Microsoft RHEL 8/9 Azure SAP HANA example, changed the colocation role to `master` and used the documented topology-before-SAPHana ordering constraint with `symmetrical=false`.

## Review Notes
- Red Hat's newer RHEL 9.4+ SAP HANA HA documentation documents the `sap-hana-ha` package and `SAPHanaController` resource agent. Microsoft Azure's current RHEL SAP HANA HA guide still documents the legacy `resource-agents-sap-hana` and `SAPHana` examples for RHEL 8/9 Azure deployments, so this post was corrected against the Azure-specific guidance.
