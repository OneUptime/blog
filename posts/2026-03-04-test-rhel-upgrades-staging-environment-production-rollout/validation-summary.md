# Validation Summary: How to Test RHEL Upgrades in a Staging Environment Before Production Rollout

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Leapp
- Convert2RHEL
- DNF/YUM
- Red Hat Subscription Manager
- systemd
- LVM snapshots

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Upgrading from RHEL 8 to RHEL 9, preparing for the upgrade and installing Leapp: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/assembly_preparing-for-the-upgrade_upgrading-from-rhel-8-to-rhel-9/
- Red Hat Enterprise Linux 9 documentation: Reviewing the pre-upgrade report: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/reviewing-the-pre-upgrade-report_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 9 documentation: Performing the upgrade: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat Enterprise Linux 9 documentation: Performing post-upgrade tasks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-post-upgrade-tasks-on-the-rhel-9-system_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 10 documentation: DNF commands list: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/dnf-commands-list
- Red Hat Enterprise Linux 9 documentation: Subscription status verification: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/automatically_installing_rhel/Red_Hat_Enterprise_Linux-9-Automatically_installing_RHEL-en-US.pdf

## Issues Found
- The Leapp installation command installed both `leapp` and `leapp-upgrade`. Red Hat documents `dnf install leapp-upgrade`; `leapp` is handled as a required package/dependency. Updated the prerequisite and command accordingly.
- The disk-space guidance referred only to 5 GB free in `/`. Red Hat documents that the pre-upgrade assessment can require up to 4 GB under `/var/lib/leapp`. Updated the check to point readers at the relevant path.
- The Convert2RHEL installation command omitted the required Convert2RHEL repository file. Added the Red Hat public repository file download before installing `convert2rhel`.
- The Leapp upgrade step implied that `leapp upgrade` itself reboots the system. Red Hat documents a manual `reboot` after `leapp upgrade`, unless `leapp upgrade --reboot` is used. Added the reboot command and clarified the alternative.
- The cleanup step claimed to remove old packages and kernels by removing `leapp`/`leapp-upgrade` and running `dnf autoremove`. Red Hat post-upgrade cleanup is more specific and version-dependent, and `dnf autoremove` is only a general unused dependency cleanup. Reworded the step to match what the remaining command actually does.

## Review Notes
The guide is technically valid as a high-level staging checklist, but real RHEL upgrade and conversion runs are version-specific. Future improvements could call out supported Leapp upgrade paths, target OS versions, cloud/RHUI options, custom repository options, and the exact Convert2RHEL repository URL for the intended target RHEL major version.
