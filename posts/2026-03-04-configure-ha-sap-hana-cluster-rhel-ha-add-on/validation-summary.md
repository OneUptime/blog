# Validation Summary: How to Configure a High-Availability SAP HANA Cluster with RHEL HA Add-On

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 for SAP Solutions
- SAP HANA
- RHEL High Availability Add-On
- Pacemaker and pcs
- RHEL System Roles for SAP
- tuned SAP HANA profiles

## Sources Consulted
- Red Hat documentation: RHEL for SAP Subscriptions and Repositories, enabling SAP HANA repositories on RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/rhel_for_sap_subscriptions_and_repositories/asmb_enable_repo_rhel-for-sap-subscriptions-and-repositories-9
- Red Hat documentation: Installing RHEL 9 for SAP Solutions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/installing_rhel_9_for_sap_solutions/installing_rhel_9_for_sap_solutions
- Red Hat documentation: Red Hat Enterprise Linux System Roles for SAP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/red_hat_enterprise_linux_system_roles_for_sap/index
- Red Hat documentation: Deploying SAP HANA Scale-Up System Replication High Availability, HA cluster requirements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/deploying_sap_hana_scale-up_system_replication_high_availability/asmb_planning_v9-deploying-scale-up-system-replication
- Red Hat documentation: Automating SAP HANA Scale-Up System Replication using the RHEL HA Add-On: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/pdf/automating_sap_hana_scale-up_system_replication_using_the_rhel_ha_add-on/Red_Hat_Enterprise_Linux_for_SAP_Solutions-9-Automating_SAP_HANA_Scale-Up_System_Replication_using_the_RHEL_HA_Add-On-en-US.pdf
- SAP Help Portal: SAP HANA Platform 2.0 SPS 07 administration changes, HWCCT replacement by HCMT: https://help.sap.com/docs/SAP_HANA_PLATFORM/42668af650f84f9384a3337bcd373692/b15d76447ce9492dbcfaa77363e2af7e.html

## Issues Found
- The repository commands enabled only the SAP Solutions and SAP NetWeaver repositories and did not include the BaseOS, AppStream, E4S, or High Availability repositories that Red Hat documents for SAP HANA HA deployments on RHEL 9. Updated the commands to use the documented RHEL 9 E4S SAP HANA repository set, including the High Availability repository.
- The post installed `rhel-system-roles-sap` without `ansible-core`. Red Hat documents Ansible Core as the local runtime for using RHEL System Roles for SAP, so the package installation command now includes `ansible-core`.
- The kernel parameter section presented fixed sysctl values as critical SAP HANA settings. Replaced that with guidance to use RHEL System Roles for SAP and current SAP/Red Hat documentation, because supported values vary by RHEL and SAP HANA version and can be managed by `tuned` or system roles.
- The validation step referred to SAP HANA Hardware Configuration Check Tool (HWCCT), which SAP states has been replaced by SAP HANA Hardware and Cloud Measurement Tools (HCMT). Updated the tool name.

## Review Notes
- The post remains a high-level guide and does not include the full Pacemaker resource configuration for SAP HANA System Replication. That is acceptable because it explicitly directs readers to SAP-specific resource agent documentation for the `pcs` resource commands.
- Production SAP HANA HA clusters require fencing/STONITH. The post installs fence agents but does not show fencing configuration; this should be expanded in a future deeper tutorial.
