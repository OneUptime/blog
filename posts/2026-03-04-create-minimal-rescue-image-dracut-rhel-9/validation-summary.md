# Validation Summary: How to Create a Minimal Rescue Image with dracut on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- dracut
- initramfs
- GRUB and grubby
- Linux kernel command-line parameters
- Rescue and emergency boot environments

## Sources Consulted
- dracut(8) manual page: https://man7.org/linux/man-pages/man8/dracut.8.html
- dracut.conf(5) manual page: https://man7.org/linux/man-pages/man5/dracut.conf.5.html
- dracut.cmdline(7) manual page: https://man7.org/linux/man-pages/man7/dracut.cmdline.7.html
- Red Hat Enterprise Linux 9 documentation, configuring kernel command-line parameters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux documentation, adding a new boot entry with grubby: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_making-persistent-changes-to-the-grub-boot-loader_managing-monitoring-and-updating-the-kernel#adding-a-new-boot-entry_assembly_making-persistent-changes-to-the-grub-boot-loader
- Red Hat Enterprise Linux 9 upgrade documentation, rescue initramfs verification examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/upgrading_from_rhel_8_to_rhel_9/troubleshooting_upgrading-from-rhel-8-to-rhel-9

## Issues Found
- The opening description said the rescue initramfs works even when the root filesystem is completely destroyed. I narrowed this to the root filesystem being unavailable and clarified that the bootloader, kernel, and initramfs must still be usable.
- The dracut config example described `/etc/dracut.conf.d/rescue-tools.conf` as being for only one rescue image. I changed the comment to say it affects future rescue image builds, because dracut reads `/etc/dracut.conf.d/*.conf` as build configuration.
- The rebuild command used `--include` for the dracut config file, which copies a file into the initramfs but is not how dracut reads build configuration. I removed that option from the rebuild command.
- The network-capable image example assumed the `network` dracut module was available. I added the `dracut-network` package installation step before using `--add "rescue network"`.
- The standalone USB section showed a commented `dd` command that wrote `vmlinuz` directly to a block device. A kernel file is not a bootable disk image, so I replaced it with guidance to configure a bootloader and copy the kernel and initramfs to the boot filesystem.
- The verification grep pattern only matched `bin/...` paths and could miss common `/usr/sbin` tool paths. I updated it to match `/usr/bin`, `/usr/sbin`, `/bin`, and `/sbin` forms.

## Review Notes
The dracut and grubby options used in the corrected examples match the documented command-line interfaces. The exact rescue image size remains environment-dependent, especially with host-only mode, installed storage stacks, compression settings, and the selected rescue tools.
