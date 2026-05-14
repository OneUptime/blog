# Validation Summary: How to Troubleshoot Leapp Upgrade Inhibitors and Failures on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Leapp
- Convert2RHEL
- DNF/YUM
- systemd

## Sources Consulted
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9, Preparing for the upgrade: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/assembly_preparing-for-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9, Reviewing the pre-upgrade report: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/reviewing-the-pre-upgrade-report_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9, Performing the upgrade: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9, Performing post-upgrade tasks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-post-upgrade-tasks-on-the-rhel-9-system_upgrading-from-rhel-8-to-rhel-9
- Red Hat documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel

## Issues Found
- The prerequisites said root or sudo access was sufficient. Red Hat documents that Leapp commands must run as root with the unconfined SELinux role, and sudo users must pass `-r unconfined_r -t unconfined_t`; the prerequisite and Leapp commands were updated.
- The disk-space guidance gave a fixed 5 GB requirement for `/`. Red Hat documents that the pre-upgrade assessment can require up to 4 GB in `/var/lib/leapp`; the wording was corrected to avoid a misleading root-filesystem-only requirement.
- The Leapp installation command installed both `leapp` and `leapp-upgrade`. Red Hat documents installing `leapp-upgrade`, which pulls the required Leapp components; the command was corrected.
- The Convert2RHEL installation step omitted the required Convert2RHEL repository file and used `dnf` where Red Hat documents `yum -y install convert2rhel`; the command and setup note were corrected.
- The upgrade step implied `leapp upgrade` reboots automatically. Red Hat documents a manual reboot after `leapp upgrade`, unless `--reboot` is used; the command sequence and explanation were corrected.
- The cleanup commands attempted to remove Leapp packages directly. Red Hat documents removing Leapp packages from the DNF exclude list first and removing remaining Leapp dependency packages; the cleanup commands were updated.

## Review Notes
The post is technically valid as a concise RHEL 8 to RHEL 9 style Leapp workflow after the fixes. Future improvements could add version-specific examples for RHEL 7 to 8 and RHEL 9 to 10, because package names and target-version options vary by upgrade path.
