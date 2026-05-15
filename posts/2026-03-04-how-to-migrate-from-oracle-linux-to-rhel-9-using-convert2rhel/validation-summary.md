# Validation Summary: How to Migrate from Oracle Linux to RHEL 9 Using Convert2RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Oracle Linux 9
- Red Hat Enterprise Linux 9
- Convert2RHEL
- Red Hat Subscription Manager
- DNF/YUM repositories

## Sources Consulted
- Red Hat Documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat Documentation: Chapter 4, Converting using the command-line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat Customer Portal: Convert2RHEL FAQ: https://access.redhat.com/articles/5941531

## Issues Found
- The prerequisites said "Oracle Linux 8 or 9 system" for a RHEL 9 migration. Red Hat's supported conversion paths convert Oracle Linux 8 to RHEL 8 and Oracle Linux 9 to the corresponding RHEL 9 minor release, so the prerequisite was narrowed to Oracle Linux 9 on a supported minor version.
- The install command used `dnf install` directly on an outdated `ftp.redhat.com` `.repo` URL. Red Hat's current documentation downloads the Red Hat GPG key and the current Convert2RHEL repository file from `cdn-public.redhat.com`, then installs the `convert2rhel` package. The commands were updated accordingly.
- The conversion command passed the activation key on the command line. Red Hat's current documentation uses `/etc/convert2rhel.ini` for RHSM credentials before running `convert2rhel analyze` and `convert2rhel`, so the command block was updated.
- The post implied Convert2RHEL would replace UEK during conversion. Red Hat documents that Oracle Linux systems must be booted into the Red Hat Compatible Kernel rather than UEK before conversion, so the UEK replacement bullet was removed and the prerequisite was added.

## Review Notes
The post is intentionally brief. A future improvement would be to mention Red Hat's full pre-conversion checklist, including stopping data-writing services, checking known limitations, firewall/proxy access, updating the source OS to the supported minor version, and rebooting before conversion.
