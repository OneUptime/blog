# Validation Summary: How to Upgrade from RHEL 8 to RHEL Using the Leapp Utility

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Red Hat Enterprise Linux 8
- Red Hat Enterprise Linux 9
- Leapp
- DNF
- Red Hat Subscription Manager
- RPM
- systemd

## Sources Consulted
- Red Hat Documentation: Upgrading from RHEL 8 to RHEL 9, supported upgrade paths and Leapp workflow: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/upgrading_from_rhel_8_to_rhel_9/planning-an-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: Preparing for the upgrade, including backup and Leapp package guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/assembly_preparing-for-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: Troubleshooting and known issues for RHEL 8 to RHEL 9 upgrades: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/troubleshooting_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool

## Issues Found
- The Leapp commands used plain `sudo leapp ...`. Red Hat's RHEL 8 to RHEL 9 upgrade documentation states that when using `sudo`, Leapp commands must be run with the unconfined SELinux role and type. Updated the `preupgrade`, `answer`, and `upgrade` examples to use `sudo -r unconfined_r -t unconfined_t leapp ...`.
- The prerequisites omitted Red Hat's documented requirement to have a full system backup or virtual machine snapshot before the upgrade. Added a concise prerequisite comment in the existing prerequisites command block.

## Review Notes
The target path from RHEL 8.10 to RHEL 9.6 is currently documented by Red Hat as supported. The post remains a concise command-oriented guide; production environments may also need repository, RHUI, EUS/AUS/E4S, SAP HANA, public cloud, or custom repository options depending on the system.
