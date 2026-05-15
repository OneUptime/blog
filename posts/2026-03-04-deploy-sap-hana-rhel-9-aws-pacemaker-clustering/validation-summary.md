# Validation Summary: How to Deploy SAP HANA on RHEL 9 in AWS with Pacemaker Clustering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 for SAP Solutions
- SAP HANA
- AWS
- Pacemaker and pcs
- RHEL System Roles for SAP
- tuned profiles

## Sources Consulted
- Red Hat documentation: Overview of Red Hat Enterprise Linux for SAP Solutions Subscription - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/pdf/overview_of_red_hat_enterprise_linux_for_sap_solutions_subscription/Red_Hat_Enterprise_Linux_for_SAP_Solutions-9-Overview_of_Red_Hat_Enterprise_Linux_for_SAP_Solutions_Subscription-en-US.pdf
- Red Hat documentation: Installing RHEL 9 for SAP Solutions, RHEL System Roles for SAP - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/assembly_rhel-system-roles-for-sap_configuring-rhel-9-for-sap-hana2-installation
- Red Hat documentation: Upgrading SAP environments from RHEL 8 to RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/upgrading_sap_environments_from_rhel_8_to_rhel_9/upgrading_sap_environments_from_rhel_8_to_rhel_9
- AWS documentation: SAP HANA High Availability on Red Hat Enterprise Linux using Pacemaker - https://docs.aws.amazon.com/sap/latest/sap-hana/sap-hana-on-aws-rhel-pacemaker.html
- AWS documentation: Operating System Requirements for SAP HANA Pacemaker on RHEL - https://docs.aws.amazon.com/sap/latest/sap-hana/sap-hana-pacemaker-rhel-os-settings.html
- SAP Help Portal: SAP HANA Hardware and Cloud Measurement Tools - https://help.sap.com/docs/HANA_HW_CLOUD_TOOLS/02bb1e64c2ae4de7a11369f4e70a6394/7e878f6e16394f2990f126e639386333.html

## Issues Found
- The prerequisite referenced SAP Note 2772999 for hardware requirements. I changed this to the SAP HANA Hardware Directory and SAP Product Availability Matrix because those are the current authoritative sources for SAP HANA hardware and supportability checks.
- The RHEL System Roles install command only installed `rhel-system-roles-sap`. I added `rhel-system-roles`, matching Red Hat's documented package set for RHEL System Roles for SAP.
- The sysctl section listed incomplete generic values in `/etc/sysctl.conf` as critical SAP settings. I replaced this with the RHEL/SAP-required `vm.max_map_count` setting in `/etc/sysctl.d/sap.conf`, included the commonly present `kernel.pid_max` setting, and changed the apply command to `sysctl --system` for sysctl.d configuration.
- The HA package installation used `fence-agents-all` and omitted AWS-specific cluster packages. I replaced it with the AWS-documented Pacemaker package set including `corosync`, `chrony`, `resource-agents`, `resource-agents-cloud`, and `fence-agents-aws`.
- The validation step referenced the older SAP HANA Hardware Configuration Check Tool (HWCCT). I updated it to SAP HANA Hardware and Cloud Measurement Tools (HCMT), which SAP documents as the replacement for SAP HANA 2.0 and newer.

## Review Notes
The guide remains a high-level checklist rather than a complete production HA deployment guide. A future revision could add AWS overlay IP routing, IAM permissions, host authentication with `pcs host auth`, STONITH resource configuration, and SAP HANA system replication resource definitions, but those additions would be beyond the requested correction scope.
