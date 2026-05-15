# Validation Summary: How to Migrate from CentOS 7 to RHEL 9 Using the Convert2RHEL Tool

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CentOS Linux 7
- Red Hat Enterprise Linux 7, 8, and 9
- Convert2RHEL
- Leapp
- yum, dnf, and subscription-manager

## Sources Consulted
- Red Hat documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/
- Red Hat documentation: Converting using the command line with Convert2RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat documentation: Upgrading from RHEL 7 to RHEL 8: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/upgrading_from_rhel_7_to_rhel_8/
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/

## Issues Found
- The post implied Convert2RHEL directly migrated CentOS 7 to RHEL 9. Updated the wording to clarify that Convert2RHEL converts CentOS 7 to RHEL 7, then Leapp upgrades RHEL 7 to RHEL 8 and RHEL 8 to RHEL 9.
- The Convert2RHEL repository and Red Hat GPG key URLs were outdated. Replaced them with the current Red Hat documented `security.access.redhat.com` and `cdn-public.redhat.com` URLs.
- The preparation steps did not account for CentOS 7 being end-of-life. Added the Red Hat documented commands to point CentOS repositories at `vault.centos.org` before updating.
- The conversion command used unsupported inline `--org` and `--activationkey` options for the documented flow. Replaced it with `/etc/convert2rhel.ini`, `convert2rhel analyze`, and `convert2rhel`.
- The post-conversion Leapp commands tried to use `dnf` immediately after converting to RHEL 7 and did not separate the two required major-version upgrades. Replaced them with the documented RHEL 7 to RHEL 8 commands using `yum` and target `8.10`, followed by the RHEL 8 to RHEL 9 commands using `dnf` and target `9.7`.

## Review Notes
The migration commands are destructive system administration commands and were validated against official Red Hat documentation rather than executed locally. Production systems should still review Leapp and Convert2RHEL reports and resolve inhibitors before continuing.
