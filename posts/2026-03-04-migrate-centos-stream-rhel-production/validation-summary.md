# Validation Summary: How to Migrate from CentOS Stream to RHEL in Production

## Status
validated

## Post Type
Tutorial / Production migration guide

## Technologies Covered
- Red Hat Enterprise Linux
- Convert2RHEL
- Red Hat Subscription Management
- DNF/YUM repositories
- LVM snapshots
- systemd
- SELinux

## Sources Consulted
- Red Hat Documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat Documentation: Converting using the command line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat Customer Portal: Convert2RHEL FAQ: https://access.redhat.com/articles/5941531
- CentOS Project Documentation: About CentOS Stream: https://docs.centos.org/centos-stream-docs/
- CentOS Project: CentOS Stream overview: https://www.centos.org/centos-stream/

## Issues Found
- The original post incorrectly presented CentOS Stream to RHEL as a production Convert2RHEL path. Red Hat documents CentOS Stream conversions as unsupported, while supported production paths are selected RHEL-derived distributions such as Alma Linux, CentOS Linux, Oracle Linux, and Rocky Linux. I updated the title, tags, description, introduction, examples, and package wording to reflect supported conversion paths and mention the CentOS Stream caveat.
- The Convert2RHEL repository URL used the old FTP-style path. I replaced it with the current Red Hat public CDN repository URL for conversions to RHEL 9.
- The installation steps omitted the Red Hat GPG key download documented by Red Hat. I added the GPG key command before installing the Convert2RHEL repository file.
- The conversion command used direct username/password and activation-key CLI examples. Current Red Hat documentation shows configuring `/etc/convert2rhel.ini`, running `convert2rhel analyze`, and then starting `convert2rhel`. I updated the commands accordingly.
- The production preparation steps did not include a reboot after updating to the supported source minor version. Red Hat documents updating to the supported minor version and rebooting before conversion, so I added `sudo reboot`.
- The connectivity check only tested `subscription.rhsm.redhat.com` with ping. Red Hat documents HTTPS access requirements, including `subscription.rhsm.redhat.com` and `cdn-public.redhat.com`; I changed the check to `curl -I` against those HTTPS endpoints.
- The LVM snapshot examples used `/dev/rhel/root`, which is not a reliable source-system path before conversion. I changed the examples to generic `/dev/<vg_name>/<lv_name>` and `/dev/<vg_name>/pre-convert` placeholders.
- The post-conversion package check only searched for CentOS package names and described `dnf distro-sync` as a verification step. I updated the wording to describe package synchronization and changed the remaining-package review to the documented extras-package check.

## Review Notes
The post is now technically accurate as a supported Convert2RHEL production guide. Future improvements could add a small supported-version table, but I avoided adding new sections because the review instructions asked for only the corrections needed.
