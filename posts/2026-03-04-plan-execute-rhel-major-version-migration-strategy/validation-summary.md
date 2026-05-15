# Validation Summary: How to Plan and Execute a RHEL Major Version Migration Strategy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Leapp in-place upgrades
- Convert2RHEL conversions
- DNF and YUM package management
- systemd service verification

## Sources Consulted
- Red Hat Documentation: Upgrading from RHEL 7 to RHEL 8 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/upgrading_from_rhel_7_to_rhel_8/index
- Red Hat Documentation: Upgrading from RHEL 8 to RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/upgrading_from_rhel_8_to_rhel_9/index
- Red Hat Documentation: Reviewing the pre-upgrade report for RHEL 8 to RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/reviewing-the-pre-upgrade-report_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: Verifying the post-upgrade state for RHEL 8 to RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/verifying-the-post-upgrade-state_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: Performing post-upgrade tasks for RHEL 8 to RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-post-upgrade-tasks-on-the-rhel-9-system_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: Converting from a Linux distribution to RHEL using Convert2RHEL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index

## Issues Found
- The Leapp prerequisite and installation command were too generic and used `dnf install leapp leapp-upgrade`, which is not correct for all supported source versions. Updated the text to refer to the appropriate Leapp upgrade packages and showed `yum install leapp-upgrade` for RHEL 7 to RHEL 8 and `dnf install leapp-upgrade` for RHEL 8 and later.
- The disk space guidance said to keep at least 5 GB free in `/`. Red Hat documents the pre-upgrade assessment as commonly requiring up to 4 GB under `/var/lib/leapp`, so the guidance was changed to check for enough space there.
- The Convert2RHEL installation command omitted the requirement to install the latest Convert2RHEL repository file first and used only `dnf`. Updated the text to mention the repository-file prerequisite and use the documented `yum -y install convert2rhel` command.
- The upgrade step implied that `leapp upgrade` itself reboots the system. Red Hat documents a manual `reboot` step unless `leapp upgrade --reboot` is used, so the command block and explanation were corrected.
- The post-upgrade verification did not include Red Hat's check that Leapp has finished all post-upgrade actions. Added the documented check before the OS and kernel verification commands.
- The cleanup step removed `leapp` and `leapp-upgrade` directly without accounting for the Leapp packages added to DNF's exclude list during the upgrade. Added the documented `dnf config-manager --save --setopt exclude=''` step and adjusted the Leapp dependency cleanup command.

## Review Notes
The guide remains intentionally high level. Future improvements could mention supported upgrade paths, target release flags such as `--target`, RHUI or custom repository options, and the need to answer Leapp answerfile questions when inhibitors require it.
