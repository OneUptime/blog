# Validation Summary: How to Troubleshoot Boot Failures After a Kernel Update on RHEL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel packages and boot entries
- GRUB and grubby
- dracut initramfs generation
- DKMS third-party kernel modules
- DNF package management
- systemd journal logs
- Linux kernel module tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing, monitoring, and updating the kernel - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_monitoring_and_updating_the_kernel/managing_monitoring_and_updating_the_kernel
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool, configuring DNF and package exclusions - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_configuring-yum_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 documentation: Interactively installing RHEL over the network, rescue mode - https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/interactively_installing_rhel_over_the_network/Red_Hat_Enterprise_Linux-9-Interactively_installing_RHEL_over_the_network-en-US.pdf
- dracut(8) Linux manual page - https://www.man7.org/linux/man-pages/man8/dracut.8.html
- lsinitrd(1) Linux manual page - https://man7.org/linux/man-pages/man1/lsinitrd.1.html
- Local command help output for `journalctl --help` and `modinfo --help`

## Issues Found
- The post stated that RHEL always provides a fallback kernel. RHEL/DNF normally keeps multiple install-only kernel packages, but this can be changed by configuration or cleanup, so the wording was softened to "normally" and "usually".
- The module comparison example used `ls` on the top-level kernel module directories, which only compares broad subdirectories rather than actual module files. Replaced it with `find ... -name '*.ko*' | sort` to compare module file paths.
- The root-filesystem scenario said to use "force-add" for storage drivers while the command used `--add-drivers`. Updated the command to `--force-drivers`, which dracut documents for adding drivers and loading them early.
- The DNF exclusion example used `exclude=...`; Red Hat documents `excludepkgs` for `/etc/dnf/dnf.conf`. Updated the example to `excludepkgs=...`.
- The rescue-mode example used `/mnt/sysimage`, which is older RHEL wording. RHEL 9 rescue mode documents `/mnt/sysroot` for chroot, so the mount and `chroot` commands were corrected.

## Review Notes
The post is technically relevant and the remaining commands are appropriate for a RHEL 9 troubleshooting guide. DKMS availability depends on third-party repositories and installed vendor modules, so those commands are valid only on systems using DKMS-managed drivers.
