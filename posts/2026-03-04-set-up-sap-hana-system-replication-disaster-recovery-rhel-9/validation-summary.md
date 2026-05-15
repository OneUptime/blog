# Validation Summary: How to Set Up SAP HANA System Replication for Disaster Recovery on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Enterprise Linux for SAP Solutions
- SAP HANA
- SAP HANA System Replication
- Pacemaker and pcs
- RHEL High Availability Add-On
- RHEL System Roles for SAP
- tuned
- sysctl

## Sources Consulted
- Red Hat Enterprise Linux for SAP Solutions 9 documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9
- Red Hat Enterprise Linux System Roles for SAP documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/red_hat_enterprise_linux_system_roles_for_sap/
- Red Hat Installing RHEL 9 for SAP Solutions documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/installing_rhel_9_for_sap_solutions/
- Red Hat Overview of RHEL for SAP Solutions subscription: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/overview_of_red_hat_enterprise_linux_for_sap_solutions_subscription/
- Red Hat Automating SAP HANA Scale-Up System Replication using the RHEL HA Add-On: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/automating_sap_hana_scale-up_system_replication_using_the_rhel_ha_add-on/
- SAP HANA Hardware and Cloud Measurement Tools documentation: https://help.sap.com/docs/HANA_HW_CLOUD_TOOLS/
- SAP HANA Platform What's New documentation noting HWCCT replacement by HCMT: https://help.sap.com/docs/SAP_HANA_PLATFORM/

## Issues Found
- The HA setup step installed `pacemaker`, `pcs`, and fencing agents without enabling the RHEL High Availability repository. Added the `rhel-9-for-x86_64-highavailability-rpms` repository enablement command.
- The RHEL System Roles install command omitted documented prerequisites. Updated it to install `ansible-core`, `rhel-system-roles-sap`, and `rhel-system-roles`.
- The sysctl section presented fixed values in `/etc/sysctl.conf` as critical SAP HANA settings. Red Hat recommends using RHEL System Roles for SAP or the `sap-hana` tuned profile and validating against applicable SAP Notes. Updated the section to verify current settings and apply manual overrides through `/etc/sysctl.d/` only when required.
- The validation step referenced SAP HANA Hardware Configuration Check Tool (HWCCT), which SAP documentation says has been replaced by SAP HANA Hardware and Cloud Measurement Tools (HCMT). Updated the reference to HCMT.

## Review Notes
The post remains a high-level operating-system preparation guide rather than a complete SAP HANA System Replication runbook. A future revision could add the actual SAP HANA replication commands and Pacemaker resource configuration for a specific supported topology, such as scale-up or scale-out, but that would be a content expansion rather than a correctness fix.
