# Validation Summary: How to Update the Kernel on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel packages
- DNF
- GRUB and grubby
- dnf-automatic
- dracut
- DKMS
- systemd journal

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing, monitoring, and updating the kernel - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_monitoring_and_updating_the_kernel/index
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool, Automating software updates - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_automating-software-updates-in-rhel-9_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 documentation: Considerations in adopting RHEL 9, /boot partition sizing - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_installer-and-image-creation_considerations-in-adopting-rhel-9
- DNF Configuration Reference: installonlypkgs and installonly_limit - https://dnf.readthedocs.io/en/stable/conf_ref.html
- DNF config-manager plugin documentation - https://dnf-plugins-core.readthedocs.io/en/stable/config_manager.html
- systemd journalctl manual page - https://man7.org/linux/man-pages/man1/journalctl.1.html

## Issues Found
- The pre-update checklist said `/boot` needed at least 200 MB free. Current Red Hat guidance says the default `/boot` partition remains 1 GB, may be insufficient for larger initramfs images, and recommends planning for at least 2 GB where possible for long-lived systems. I changed the command comment to avoid a misleading fixed free-space threshold and keep the check focused on verifying available `/boot` space.

## Review Notes
- The main workflow is technically correct for RHEL 9: Red Hat documents updating with `dnf update kernel` and rebooting, and documents `grubby --set-default` for selecting a default kernel.
- DNF's `installonly_limit` default of 3 is confirmed by DNF documentation, with kernels treated as install-only packages.
- `dnf-automatic-download.timer` is appropriate for downloading updates without installing them; Red Hat documents that this timer overrides the `apply_updates` and `download_updates` settings in `/etc/dnf/automatic.conf`.
