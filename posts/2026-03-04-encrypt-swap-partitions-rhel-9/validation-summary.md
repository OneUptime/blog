# Validation Summary: How to Encrypt Swap Partitions on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux swap
- dm-crypt and LUKS
- `/etc/crypttab`
- `/etc/fstab`
- LVM
- zram-generator
- dracut

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 15: Getting started with swap: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-swap_managing-storage-devices
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 19: Encrypting block devices using LUKS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/encrypting-block-devices-using-luks_managing-storage-devices
- Red Hat Enterprise Linux 9 Configuring basic system settings, power management and hibernation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- systemd `crypttab(5)` documentation: https://www.freedesktop.org/software/systemd/man/crypttab.html
- Linux man-pages `crypttab(5)` rendering for systemd: https://man7.org/linux/man-pages/man5/crypttab.5@@systemd.html
- cryptsetup upstream man page sources: https://gitlab.com/cryptsetup/cryptsetup/-/blob/main/man/cryptsetup.8.adoc
- systemd zram-generator documentation: https://github.com/systemd/zram-generator
- zram-generator example configuration: https://raw.githubusercontent.com/systemd/zram-generator/main/zram-generator.conf.example
- Red Hat Enterprise Linux 9 considerations/package information for `zram-generator`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/considerations_in_adopting_rhel_9/removed-packages_assembly_changes-to-packages

## Issues Found
- The random-key crypttab setup said to get the device path or UUID of the swap partition. Using the swap filesystem UUID for this method is unsafe because the `swap` crypttab option runs `mkswap` on the encrypted mapping and recreates the swap signature. I changed the wording to request a stable device path and explicitly avoid the swap UUID.
- The LUKS method implied that a persistent encrypted swap partition alone provides hibernation support. I added a caveat that boot loader and initramfs resume settings must also be configured, and clarified that random-key encrypted swap cannot support hibernation.
- The LUKS method appended a new encrypted swap entry to `/etc/fstab` without reminding readers to remove or comment the old raw swap entry. I added that note to prevent both raw and encrypted swap entries from being configured.
- The LVM method said to encrypt the entire volume group. LVM itself is not encryption; the swap LV is protected when the volume group is inside an encrypted LUKS device. I corrected the wording.

## Review Notes
The commands and configuration snippets are otherwise consistent with RHEL 9 swap management, LUKS usage, systemd crypttab behavior, and zram-generator configuration. For production documentation, consider adding system-specific hibernation resume examples only if the target boot layout is known, because the required kernel command line and initramfs setup vary by storage stack.
