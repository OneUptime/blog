# Validation Summary: How to Deploy SAP HANA on RHEL 9 in Azure with Pacemaker Clustering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 for SAP Solutions
- SAP HANA
- Azure virtual machines for SAP workloads
- Pacemaker and pcs
- RHEL HA Add-On
- SAP HANA HA resource agents
- TuneD and RHEL System Roles for SAP

## Sources Consulted
- Red Hat documentation: RHEL for SAP Subscriptions and Repositories, required repositories for SAP HANA on RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/rhel_for_sap_subscriptions_and_repositories/asmb_enable_repo_rhel-for-sap-subscriptions-and-repositories-9
- Red Hat documentation: Deploying SAP HANA Scale-Up System Replication High Availability, SAP HANA HA components: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/deploying_sap_hana_scale-up_system_replication_high_availability/asmb_config_pacemaker_v9-deploying-scale-up-system-replication
- Red Hat documentation: Deploying SAP HANA Scale-Out System Replication High Availability, SAP HANA HA components: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/deploying_sap_hana_scale-out_system_replication_high_availability/asmb_config_pacemaker_v9-deploying-scale-out-system-replication
- Microsoft Learn: Set up Pacemaker on RHEL in Azure: https://learn.microsoft.com/en-us/azure/sap/workloads/high-availability-guide-rhel-pacemaker
- Red Hat documentation: Red Hat Enterprise Linux System Roles for SAP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/red_hat_enterprise_linux_system_roles_for_sap/red_hat_enterprise_linux_system_roles_for_sap
- SAP Help Portal: SAP HANA Hardware and Cloud Measurement Tools: https://help.sap.com/docs/HANA_HW_CLOUD_TOOLS/02bb1e64c2ae4de7a11369f4e70a6394/7e878f6e16394f2990f126e639386333.html
- SAP Help Portal: Check the Installation Using the Command-Line Interface: https://help.sap.com/docs/SAP_HANA_PLATFORM/2c1988d620e04368aa4103bf26f17727/3d1b1608d7334ff08ace1fafd42f3a03.html

## Issues Found
- The repository enablement commands used non-E4S SAP repository IDs and did not include BaseOS, AppStream, or High Availability repositories. Updated the commands to use the RHEL 9 E4S repositories documented for SAP HANA HA systems, including the HA repository.
- The post installed the classic `resource-agents-sap-hana` package. Updated this to `sap-hana-ha`, the current RHEL 9.4+ package for the combined SAP HANA HA resource agents used for scale-up and scale-out deployments.
- The prerequisites did not state the RHEL 9 minor release needed for the current `sap-hana-ha` package. Updated the prerequisite to RHEL 9.4 or later.
- The Azure HA package example installed `fence-agents-all`. Updated it to install `resource-agents-cloud` and `fence-agents-azure-arm`, matching Microsoft guidance for RHEL 9 Pacemaker clusters in Azure.
- The HA setup text did not mention Azure fencing. Added a concise note to configure Azure fencing with `fence_azure_arm` or SBD.
- The sysctl section listed generic tuning values as critical SAP settings and used `/etc/sysctl.conf`. Updated it to verify the SAP settings Red Hat documents publicly in `/etc/sysctl.d/sap.conf` and to apply sysctl drop-ins with `sysctl --system`.
- The validation step referenced HWCCT, which SAP has replaced for SAP HANA 2.0 and newer with the SAP HANA Hardware and Cloud Measurement Tools. Updated the text to reference HCMT and the SAP HANA lifecycle manager installation check.

## Review Notes
The guide remains high-level and does not include a full supported SAP HANA system replication or Pacemaker resource configuration. Future improvements should link to the exact Red Hat and Microsoft deployment guide that matches the target topology, such as scale-up versus scale-out and Azure fence agent versus SBD.
