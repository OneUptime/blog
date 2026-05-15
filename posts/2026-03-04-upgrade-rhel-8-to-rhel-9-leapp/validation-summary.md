# Validation Summary: How to Perform an In-Place Upgrade from RHEL 8 to RHEL Using Leapp

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 8
- Red Hat Enterprise Linux 9
- Leapp
- DNF
- RPM
- SELinux
- Red Hat Subscription Manager
- libvirt snapshots

## Sources Consulted
- Red Hat Documentation: Upgrading from RHEL 8 to RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/
- Red Hat Documentation: Chapter 1, Supported upgrade paths - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/con_supported-upgrade-paths_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: Chapter 7, Performing post-upgrade tasks on the RHEL 9 system - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-post-upgrade-tasks-on-the-rhel-9-system_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: Chapter 9, Troubleshooting - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/troubleshooting_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: RHEL 9.7 Release Notes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/9.7_release_notes/9.7_release_notes
- Red Hat Documentation: Installing and using dynamic programming languages in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/
- Red Hat Documentation: Considerations in adopting RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/considerations_in_adopting_rhel_9

## Issues Found
- The Leapp commands used plain `sudo`. Red Hat documents that when using `sudo` for Leapp commands, the command must be run with the unconfined SELinux role and type. Updated `leapp preupgrade`, `leapp answer`, and `leapp upgrade` examples to use `sudo -r unconfined_r -t unconfined_t`.
- The upgrade section implied that having no inhibitors is enough to proceed. Red Hat recommends reviewing the full pre-upgrade report and resolving reported issues. Updated the wording to require reviewing and addressing the report issues before upgrade.
- The cleanup section removed Leapp dependency packages and deleted Leapp logs before the old RHEL 8 package cleanup. Red Hat's post-upgrade task order clears DNF excludes, removes remaining RHEL 8 packages, removes Leapp dependencies, and treats removal of Leapp data as optional because it can limit support troubleshooting. Updated the cleanup flow and wording accordingly.
- The kernel listing command used `rpm -qa kernel-core`, which is less precise for querying installed kernel-core package instances. Updated it to `rpm -q kernel-core`.
- The checklist still referred to cleaning up Leapp data before removing old kernels. Updated the checklist to reflect the corrected post-upgrade order.

## Review Notes
The RHEL 8.10 to RHEL 9.7 target is currently supported for standard RHEL systems according to Red Hat's RHEL 9.7 release notes and upgrade-path documentation. SAP HANA and RHUI/PAYG systems have additional path and channel constraints that should be checked against Red Hat documentation before use.
