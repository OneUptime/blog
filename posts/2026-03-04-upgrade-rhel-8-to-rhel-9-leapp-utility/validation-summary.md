# Validation Summary: How to Upgrade from RHEL 8 to RHEL 9 Using the Leapp Utility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 8
- Red Hat Enterprise Linux 9
- Leapp utility
- DNF
- Red Hat Subscription Manager
- SELinux roles for sudo

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Upgrading from RHEL 8 to RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/
- Red Hat documentation: Supported upgrade paths: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/con_supported-upgrade-paths_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Preparing a RHEL 8 system for the upgrade: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/assembly_preparing-for-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Reviewing the pre-upgrade report: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/reviewing-the-pre-upgrade-report_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Performing the upgrade: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Verifying the post-upgrade state: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/verifying-the-post-upgrade-state_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Performing post-upgrade tasks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-post-upgrade-tasks-on-the-rhel-9-system_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 8 documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/

## Issues Found
- Removed the CentOS Convert2RHEL command block from the RHEL 8 to RHEL 9 Leapp upgrade flow. Convert2RHEL converts supported non-RHEL distributions to the corresponding RHEL major/minor release; it is not part of an in-place RHEL 8 to RHEL 9 upgrade procedure.
- Changed the cleanup description from removing old packages and kernels to removing Leapp packages from DNF excludes and removing remaining Leapp dependency packages. The listed commands match Red Hat's Leapp cleanup commands but do not remove old kernels.
- Replaced the rollback bullet that suggested booting from the old kernel. Booting an older kernel is not a reliable rollback for an in-place major-version userspace upgrade; the supported rollback approach is restoring from backup or an appropriate snapshot, then investigating Leapp logs before retrying.

## Review Notes
- The Leapp installation, pre-upgrade, upgrade, report review, reboot, and post-upgrade verification commands are consistent with Red Hat's RHEL 8 to RHEL 9 upgrade documentation.
- Current Red Hat documentation lists specific supported source and target minor releases. Readers should confirm the supported path for their exact RHEL minor version before running Leapp.
