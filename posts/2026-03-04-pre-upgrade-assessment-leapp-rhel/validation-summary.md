# Validation Summary: How to Run a Pre-Upgrade Assessment with Leapp on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Leapp
- Convert2RHEL
- DNF/YUM
- Red Hat Subscription Manager

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Upgrading from RHEL 8 to RHEL 9, preparing for the upgrade and installing Leapp: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/upgrading_from_rhel_8_to_rhel_9/planning-an-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 9 documentation: Reviewing the pre-upgrade report and performing the upgrade: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/upgrading_from_rhel_8_to_rhel_9/appendix-rhel-8-repositories_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 8 documentation: Upgrading from RHEL 7 to RHEL 8, preparing for the upgrade and reviewing the pre-upgrade report: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/upgrading_from_rhel_7_to_rhel_8/index
- Red Hat Enterprise Linux 8 documentation: Converting from a Linux distribution to RHEL using Convert2RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat Enterprise Linux documentation: Verifying the post-upgrade state and performing post-upgrade tasks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/upgrading_from_rhel_8_to_rhel_9/proc_updating-nss-databases-from-dbm-to-sqlite_applying-security-policies

## Issues Found
- The Leapp install command installed both `leapp` and `leapp-upgrade`. Red Hat documents installing `leapp-upgrade`, which brings in the required Leapp components, so the command and prerequisite were updated.
- The disk-space guidance said to keep at least 5 GB free in `/`. Red Hat specifically documents that pre-upgrade assessment data is stored under `/var/lib/leapp` and can require up to 4 GB, so the guidance was corrected.
- The Convert2RHEL command used `dnf install convert2rhel` without first installing the Red Hat GPG key and Convert2RHEL repository file. The command block was updated to match Red Hat's documented setup flow for conversions to RHEL 9.
- The Leapp commands used plain `sudo`. Red Hat documents using the unconfined SELinux role and type when running Leapp through sudo, so the `preupgrade` and `upgrade` commands were updated.
- The upgrade step said the system would reboot after `leapp upgrade`, but Red Hat documents either manually rebooting afterward or using `leapp upgrade --reboot`. The command was updated to use `--reboot`.
- The cleanup step omitted Red Hat's caveat that remaining Leapp packages may need to be removed from the DNF exclude list before removal. The cleanup text was updated.

## Review Notes
The post remains a compact, general guide. Future improvements could mention supported Leapp upgrade paths and target-version examples, because the exact `--target` value depends on the source RHEL major/minor version and current Red Hat support matrix.
