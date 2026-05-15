# Validation Summary: How to Migrate from AlmaLinux to RHEL 9 for Full Red Hat Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- AlmaLinux
- Red Hat Enterprise Linux 9
- Convert2RHEL
- Red Hat Subscription Manager
- Red Hat Insights
- rhc
- yum/dnf
- RPM

## Sources Consulted
- Red Hat Documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat Documentation: Chapter 4, Converting using the command-line, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat Documentation: Client Configuration Guide for Red Hat Insights, https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/epub/client_configuration_guide_for_red_hat_insights/assembly-insights-cli-options
- Red Hat Documentation: Remote host configuration and management, https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/remote_host_configuration_and_management/rhc-configuring_intro-rhc

## Issues Found
- The prerequisites said "AlmaLinux 8 or 9", which implied AlmaLinux 8 could be converted directly to RHEL 9. Red Hat documents supported conversion paths by matching source and target minor versions, such as AlmaLinux 9.x to the corresponding RHEL 9.x and AlmaLinux 8.10 to RHEL 8.10. Updated the prerequisite to specify a supported AlmaLinux 9 minor release for RHEL 9 conversion.
- The Convert2RHEL repository installation command used an outdated or incorrect `ftp.redhat.com` URL. Replaced it with Red Hat's documented GPG key download and current `cdn-public.redhat.com` repository file for RHEL 9 conversions.
- The conversion command used `--activationkey` directly. Current Red Hat documentation for supported command-line RHSM conversion instructs users to place the organization ID and activation key in `/etc/convert2rhel.ini`, run the pre-conversion analysis, and then run `convert2rhel`. Updated the command block accordingly.
- The verification step said `rpm -qa | grep almalinux` should return nothing. Red Hat notes that packages without RHEL counterparts and third-party packages may be left unchanged, so this was too absolute. Updated the note to tell readers to review remaining AlmaLinux-branded packages.
- The Insights step registered `insights-client` without ensuring it was installed. Added an install command before registration.

## Review Notes
The guide remains intentionally brief. A future expansion could cover Red Hat's full pre-conversion checklist, including stopping data-writing services, disabling antivirus or configuration management during conversion, checking known limitations, ensuring required network access, and using Satellite or custom repositories where applicable.
