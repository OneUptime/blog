# Validation Summary: How to Migrate from CentOS 7 to RHEL 9 Using Convert2RHEL and Leapp

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- CentOS Linux 7
- Red Hat Enterprise Linux 7, 8, and 9
- Convert2RHEL
- Leapp
- Red Hat Subscription Manager
- yum and dnf

## Sources Consulted
- Red Hat Documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/
- Red Hat Documentation: Supported conversion paths for Convert2RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/con_supported-conversion-paths_converting-from-a-linux-distribution-to-rhel
- Red Hat Documentation: Converting using the command line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat Documentation: Upgrading from RHEL 7 to RHEL 8: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/upgrading_from_rhel_7_to_rhel_8/index
- Red Hat Documentation: Upgrading from RHEL 8 to RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/upgrading_from_rhel_8_to_rhel_9/index

## Issues Found
- The original post implied a direct CentOS 7 to RHEL 9 migration. Red Hat's supported Convert2RHEL path converts CentOS Linux 7.9 to RHEL 7.9, and Leapp performs in-place upgrades to the next major RHEL version. Updated the overview and migration commands to show CentOS 7.9 to RHEL 7.9, then RHEL 7.9 to RHEL 8.10, then RHEL 8 to RHEL 9.
- The original commands used `dnf` to install Convert2RHEL on CentOS 7. CentOS 7 uses `yum` by default, and Red Hat documents installing the current Convert2RHEL repo file and then running `yum install convert2rhel`. Updated the installation commands accordingly.
- The original post did not run `convert2rhel analyze` or `convert2rhel`. Added the pre-conversion analysis and conversion commands.
- The Leapp commands did not specify supported target releases and only showed a single upgrade. Updated them to use `--target 8.10` for RHEL 7 to RHEL 8 and `--target 9.7` for RHEL 8 to RHEL 9.
- The cleanup section removed Leapp packages directly, but Red Hat documents removing Leapp packages from the DNF exclude list before removing remaining Leapp packages. Updated the cleanup commands.
- The rollback section suggested booting an old kernel as a rollback option. For failed Leapp upgrades, Red Hat directs users to logs and standard disaster recovery such as backup restore or snapshots. Replaced that item with relevant Leapp log paths.

## Review Notes
This remains a high-level migration guide. A production-ready runbook should also cover Red Hat account registration details, activation keys, repository enablement, application-specific checks, cloud/RHUI handling, SELinux post-upgrade remediation, and confirming the exact target RHEL 9 minor release selected for the environment against Red Hat's supported upgrade path table.
