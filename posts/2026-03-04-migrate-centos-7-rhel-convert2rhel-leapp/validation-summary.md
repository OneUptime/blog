# Validation Summary: How to Migrate from CentOS 7 to RHEL Using Convert2RHEL and Leapp

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CentOS Linux 7
- Red Hat Enterprise Linux 7, 8, and 9
- Convert2RHEL
- Leapp
- Red Hat Subscription Manager
- yum and dnf

## Sources Consulted
- Red Hat documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat documentation: Upgrading from RHEL 7 to RHEL 8, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/upgrading_from_rhel_7_to_rhel_8/index
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/upgrading_from_rhel_8_to_rhel_9/index

## Issues Found
- The CentOS 7 update step did not account for CentOS Linux 7 end-of-life repository mirror changes. Added the Red Hat-documented commands to switch CentOS repository definitions from mirrorlist entries to vault.centos.org before running `yum update`.
- The Convert2RHEL repository URL was outdated. Replaced it with Red Hat's current `cdn-public.redhat.com` repository file URL for RHEL 7 conversions.
- The Convert2RHEL setup omitted the Red Hat GPG key download and pre-conversion analysis. Added the documented GPG key download, `/etc/convert2rhel.ini` activation key configuration, `convert2rhel analyze`, and a separate conversion command.
- The RHEL 7 to RHEL 8 Leapp section enabled only the Extras repository. Added the Base repository and release-unset step so the system uses up-to-date RHEL 7.9 content before installing and running Leapp.
- The Leapp upgrade examples did not reboot after `leapp upgrade`. Added the required reboot after both the RHEL 7 to 8 and RHEL 8 to 9 upgrade commands.
- The optional RHEL 8 to RHEL 9 section used target `9.4` without noting that current Red Hat documentation treats that as an EUS path. Updated the example to target `9.7`, the current non-EUS supported path shown in Red Hat's supported upgrade paths.
- The chained RHEL 8 to RHEL 9 upgrade path omitted cleanup for systems previously upgraded from RHEL 7. Added Red Hat's documented removal of old Leapp packages and leftover repository data before installing the RHEL 8 to 9 Leapp packages.

## Review Notes
The post is still a high-level guide. Production systems should also follow the full Red Hat planning, inhibitor remediation, backup verification, post-upgrade task, and application validation procedures for their architecture, subscription channel, Satellite/RHUI setup, and any SAP, FIPS, Real Time, or custom repository requirements.
