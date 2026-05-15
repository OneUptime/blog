# Validation Summary: How to Use RHEL System Roles for SAP Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux for SAP Solutions
- RHEL System Roles for SAP
- Ansible Core
- SAP HANA
- SAP NetWeaver / SAP ABAP Platform
- Pacemaker high availability for SAP

## Sources Consulted
- Red Hat Enterprise Linux System Roles for SAP documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/red_hat_enterprise_linux_system_roles_for_sap/index
- Red Hat Installing RHEL 9 for SAP Solutions, RHEL System Roles for SAP chapter: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/assembly_rhel-system-roles-for-sap_configuring-rhel-9-for-sap-hana2-installation
- Red Hat Installing RHEL 10 for SAP Solutions, RHEL System Roles for SAP chapter: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/10/html/installing_rhel_10_for_sap_solutions/assembly_rhel-system-roles-for-sap_installing-rhel-10
- Red Hat RHEL System Roles for SAP Quick Start Guide: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/8/html/red_hat_enterprise_linux_system_roles_for_sap/assembly_quick-start-guide-to-rhel-system-roles-for-sap_rhel-system-roles-for-sap

## Issues Found
- The example playbooks enabled `/etc/hosts` management but did not mention or set `sap_domain`. Red Hat documents that `sap_general_preconfigure` can fail when a managed node has no DNS domain, and that `sap_domain` can be used to avoid this. Added a prerequisite and `sap_domain: example.com` placeholders in both playbooks.
- The post said `sap_general_preconfigure` handles time synchronization. Red Hat recommends the separate Linux System Roles `timesync` role for time synchronization; the SAP preconfigure role validates DNS/domain-related settings. Replaced this with DNS domain validation.
- The post said `sap_hana_preconfigure` installs required package groups for HANA. The role installs required packages, not necessarily package groups. Updated the wording to "Required packages for HANA."

## Review Notes
- The role names, RPM package name, repository enablement command, Ansible playbook structure, reboot-related variables, and NetWeaver swap variable matched Red Hat documentation.
- The `sap_ha_pacemaker_cluster` role is listed correctly, but Red Hat documents it as Technology Preview in the RHEL 9 System Roles for SAP documentation.
- For production systems, Red Hat recommends using assertion mode first, backing up systems, and testing on QA systems before running the roles in normal mode.
