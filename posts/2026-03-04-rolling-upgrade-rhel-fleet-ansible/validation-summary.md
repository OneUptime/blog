# Validation Summary: How to Perform a Rolling Upgrade of RHEL Across a Fleet Using Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Leapp
- Convert2RHEL
- DNF/YUM
- Red Hat Subscription Manager
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Upgrading from RHEL 8 to RHEL 9, preparing for the upgrade: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/assembly_preparing-for-the-upgrade_upgrading-from-rhel-8-to-rhel-9/
- Red Hat Enterprise Linux 9 documentation: Performing the RHEL 8 to RHEL 9 upgrade: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 9 documentation: Performing post-upgrade tasks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-post-upgrade-tasks-on-the-rhel-9-system_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 8 documentation: Converting from a Linux distribution to RHEL using Convert2RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel

## Issues Found
- The post described the process as an Ansible rolling upgrade, but Red Hat documentation states that automating the Leapp pre-upgrade and upgrade process with configuration management is not supported, and specifically says not to execute an Ansible playbook during the in-place upgrade. Updated the title, tags, description, overview, and summary to describe a Leapp-based rolling upgrade instead.
- The Leapp installation command installed both `leapp` and `leapp-upgrade`. Red Hat documents installing the Leapp utility with `dnf install leapp-upgrade`, with related Leapp packages supplied as dependencies or package contents. Updated the command and prerequisite wording.
- The Convert2RHEL install command omitted the requirement to install the current Convert2RHEL repository file first, and Red Hat documents installing the utility with `yum -y install convert2rhel`. Updated the wording and command.
- The pre-migration assessment only covered `leapp preupgrade`. Convert2RHEL has its own pre-conversion analysis command, `convert2rhel analyze`. Added the Convert2RHEL analysis command.
- The upgrade step implied that `leapp upgrade` alone reboots automatically. Red Hat documents a manual `reboot` after `leapp upgrade`, or use of `leapp upgrade --reboot` to skip the manual step. Updated the command sequence and explanation.
- The cleanup step used a generic `dnf remove leapp leapp-upgrade`, which does not match Red Hat's documented post-upgrade cleanup guidance. Updated the cleanup text to point to Red Hat's post-upgrade tasks and included the documented RHEL 8 to 9 Leapp dependency removal command.

## Review Notes
The post remains a high-level operational guide rather than a complete fleet orchestration procedure. Future improvements could add a supported fleet-level rollout pattern that runs Leapp steps per host while respecting Red Hat's limitations on configuration management during the actual in-place upgrade.
