# Validation Summary: How to Set Up SAP S/4HANA on RHEL 9 with HANA System Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 for SAP Solutions
- SAP S/4HANA
- SAP HANA System Replication
- RHEL High Availability Add-On
- Pacemaker and pcs
- RHEL System Roles for SAP
- SAP HANA tuning and validation tools

## Sources Consulted
- Red Hat Enterprise Linux for SAP Solutions 9: RHEL for SAP Subscriptions and Repositories, Enable the Required Repositories: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/rhel_for_sap_subscriptions_and_repositories/asmb_enable_repo_rhel-for-sap-subscriptions-and-repositories-9
- Red Hat Enterprise Linux for SAP Solutions 9: Installing RHEL 9 for SAP Solutions, RHEL System Roles for SAP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/assembly_rhel-system-roles-for-sap_configuring-rhel-9-for-sap-hana2-installation
- Red Hat Enterprise Linux for SAP Solutions 9: Deploying SAP HANA Scale-Up System Replication High Availability, Planning the HA cluster setup: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/deploying_sap_hana_scale-up_system_replication_high_availability/asmb_planning_v9-deploying-scale-up-system-replication
- Red Hat Enterprise Linux for SAP Solutions 9: Deploying SAP HANA Scale-Up System Replication High Availability, Configuring the Pacemaker cluster: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/deploying_sap_hana_scale-up_system_replication_high_availability/deploying_sap_hana_scale-up_system_replication_high_availability
- SAP Help Portal: SAP HANA Hardware and Cloud Measurement Tools: https://help.sap.com/docs/HANA_HW_CLOUD_TOOLS/02bb1e64c2ae4de7a11369f4e70a6394/7e878f6e16394f2990f126e639386333.html
- Red Hat Enterprise Linux 9: Managing, monitoring, and updating the kernel, Adjusting kernel parameters for database servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/adjusting-kernel-parameters-for-database-servers_managing-monitoring-and-updating-the-kernel

## Issues Found
- The prerequisites cited SAP Note 2772999, which is not the RHEL 9 SAP installation/configuration note. Updated the prerequisite to cite SAP Notes 3108316 for RHEL 9 installation/configuration and 3108302 for SAP HANA recommended OS settings on RHEL 9.
- The repository commands enabled only the SAP Solutions and SAP NetWeaver repositories and omitted BaseOS, AppStream, and High Availability E4S repositories needed for a supported SAP HANA HA setup tied to an SAP-supported RHEL minor release. Updated the example to set an E4S release lock and enable the relevant E4S repositories.
- The package example installed `resource-agents-sap-hana`, while current Red Hat RHEL 9 scale-up HANA system replication guidance documents the `sap-hana-ha` package for supported HANA 2.0 SPS05 rev 59.04 or newer setups. Updated the package name.
- The RHEL System Roles install command omitted `ansible-core` and `rhel-system-roles`, which Red Hat documents as required packages for using the SAP roles. Added both packages.
- The sysctl instructions pointed at `/etc/sysctl.conf` and used `sysctl -p`, which applies that file only. Updated the text to prefer a dedicated `/etc/sysctl.d/` file and use `sysctl --system`.
- The validation step referenced HWCCT. Updated it to HCMT, the SAP HANA hardware and cloud measurement tool used for current SAP HANA hardware/cloud validation workflows.

## Review Notes
The HA setup remains intentionally condensed; production deployments should still follow the full Red Hat workflow for fencing/STONITH, firewalld, host authentication, cluster setup, resource creation, and failover testing. The sysctl values are plausible examples, but RHEL System Roles and tuned profiles are the preferred way to enforce SAP-specific OS settings.
