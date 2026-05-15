# Validation Summary: How to Migrate from Rocky Linux to RHEL 9 Using Convert2RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rocky Linux 9
- Red Hat Enterprise Linux 9
- Convert2RHEL
- Red Hat Subscription Manager
- DNF/YUM repositories

## Sources Consulted
- Red Hat Documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat Documentation: Converting using the command-line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat Customer Portal: Convert2RHEL FAQ: https://access.redhat.com/articles/5941531

## Issues Found
- The prerequisites listed Rocky Linux 8 or 9 for a RHEL 9 conversion. Red Hat documents supported conversions by corresponding major/minor versions, so Rocky Linux 8 converts to RHEL 8, not RHEL 9. Updated the prerequisite to Rocky Linux 9 on a supported conversion path.
- The Convert2RHEL repository installation command used an outdated `ftp.redhat.com` URL and attempted to install a `.repo` file with `dnf install`. Red Hat currently documents downloading the Red Hat GPG key and the RHEL 9 Convert2RHEL repository file from `cdn-public.redhat.com`, then installing the package.
- The conversion command passed `--org` and `--activationkey` directly to `convert2rhel`. Current Red Hat documentation configures `/etc/convert2rhel.ini` with `org` and `activation_key`, runs `convert2rhel analyze`, then runs `convert2rhel`. Updated the command block accordingly.
- The post-conversion sequence ran update before reboot. Red Hat documents rebooting after conversion so the system boots the newly installed RHEL kernel. Moved `sudo reboot` before post-conversion verification and update commands.
- The verification section expected `rpm -qa | grep rocky` to return nothing. Red Hat documents checking third-party packages that remained unchanged with `yum list extras`/`dnf list extras` against a RHEL repository. Updated the verification command to match that guidance.

## Review Notes
The post remains intentionally brief. For production use, Red Hat's planning guidance includes additional prerequisites such as checking known issues and limitations, stopping important data-writing services, disabling antivirus during conversion, installing `sos`, enabling Simple Content Access, and ensuring firewall/proxy access to required Red Hat endpoints.
