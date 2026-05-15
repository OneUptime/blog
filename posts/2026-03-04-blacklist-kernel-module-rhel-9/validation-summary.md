# Validation Summary: How to Blacklist a Kernel Module on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel modules
- kmod / modprobe configuration
- dracut initramfs generation
- GRUB kernel command-line parameters
- NetworkManager and IPv6 sysctl behavior

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Preventing kernel modules from being automatically loaded at system boot time": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/managing_monitoring_and_updating_the_kernel/configuring-kernel-parameters-permanently-by-using-the-kernel-settings-rhel-system-role_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 documentation, "Changing kernel command-line parameters for all boot entries": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 documentation, "Using NetworkManager to disable IPv6 for a specific connection": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/using-networkmanager-to-disable-ipv6-for-a-specific-connection_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation, "Boot options reference": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/custom-boot-options_rhel-installer
- Local `modprobe.d(5)` manual page from kmod.
- dracut manual references for `--force` and `--regenerate-all`: https://www.man7.org/linux/man-pages/man8/dracut.8.html

## Issues Found
- The post said the `install` directive tells the kernel to run `/bin/false`. Updated this to say `modprobe` runs `/bin/false`, matching `modprobe.d(5)` and Red Hat documentation.
- The post said the `install` directive makes a module impossible to load, described the result as a complete block, and later said USB storage could be prevented from loading under any circumstances. Narrowed this to normal automatic and `modprobe`-based loading, because the `install` directive affects modprobe behavior rather than every possible kernel module insertion path.
- The verification step said `sudo modprobe nouveau` should fail silently or show blocked. Updated the comment to state that it should return a non-zero exit code when the `install` directive uses `/bin/false`, matching the examples in the post.

## Review Notes
The core workflow is technically correct for RHEL 9: use `blacklist` plus `install <module> /bin/false`, rebuild initramfs with dracut when early boot is involved, and use `modprobe.blacklist=` for kernel command-line blocking. The IPv6 section correctly notes that IPv6 is built into the kernel and should not be handled as a removable module; Red Hat's networking documentation prefers NetworkManager for connection-specific disabling, while sysctl/kernel tunables require additional configuration consideration.
