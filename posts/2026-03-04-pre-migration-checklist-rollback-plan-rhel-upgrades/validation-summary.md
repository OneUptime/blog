# Validation Summary: How to Create a Pre-Migration Checklist and Rollback Plan for RHEL Upgrades

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Leapp
- Convert2RHEL
- DNF/YUM
- LVM snapshots

## Sources Consulted
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9, preparing for the upgrade: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/assembly_preparing-for-the-upgrade_upgrading-from-rhel-8-to-rhel-9/
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9, reviewing the pre-upgrade report: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/reviewing-the-pre-upgrade-report_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9, performing the upgrade: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9, verifying the post-upgrade state: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/verifying-the-post-upgrade-state_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9, performing post-upgrade tasks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-post-upgrade-tasks-on-the-rhel-9-system_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index

## Issues Found
- The disk-space checklist specified at least 5 GB free in `/`, but Red Hat documents the pre-upgrade assessment as using up to 4 GB in `/var/lib/leapp`, with actual requirements depending on the system. Updated the wording to focus on sufficient free space for the upgrade and `/var/lib/leapp`.
- The Convert2RHEL install command skipped the required Convert2RHEL repository file. Added the current Red Hat repository-file installation step before installing `convert2rhel`.
- The cleanup commands removed `leapp` and `leapp-upgrade` directly. Red Hat's post-upgrade guidance says to remove Leapp packages from the DNF exclude list and remove remaining Leapp dependency packages. Updated the cleanup commands accordingly.
- The rollback plan implied LVM snapshots and booting an old kernel were complete rollback methods. Red Hat warns that LVM snapshots are not a full backup, and booting an older kernel is only useful for troubleshooting. Updated the rollback bullets to make those limitations explicit.

## Review Notes
The post remains a high-level checklist. For production use, readers should match the Leapp and Convert2RHEL commands to their exact source and target RHEL versions, architecture, repository model, and Red Hat supported upgrade or conversion path.
