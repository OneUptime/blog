# Validation Summary: How to Fix 'GRUB Rescue' Errors and Recover the Bootloader on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- GRUB 2
- BIOS/MBR boot recovery
- UEFI boot recovery
- RHEL rescue environment
- dracut
- grubby
- efibootmgr

## Sources Consulted
- GNU GRUB Manual: GRUB only offers a rescue shell - https://www.gnu.org/software/grub/manual/grub/html_node/GRUB-only-offers-a-rescue-shell.html
- GNU GRUB Manual: normal command - https://www.gnu.org/software/grub/manual/grub/html_node/normal.html
- Red Hat Enterprise Linux 7 System Administrator's Guide: Working with GRUB 2 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-working_with_the_grub_2_boot_loader
- Red Hat Enterprise Linux 8 Managing, monitoring, and updating the kernel: Reinstalling GRUB - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_reinstalling-grub_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 installer troubleshooting: Reinstalling the GRUB boot loader from rescue mode - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/troubleshooting-after-installation_rhel-installer
- Red Hat Enterprise Linux 9 considerations: GRUB configuration file layout changes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/considerations_in_adopting_rhel_9
- Red Hat Enterprise Linux 10 Managing, monitoring, and updating the kernel: Reinstalling GRUB - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_monitoring_and_updating_the_kernel/reinstalling-grub
- Red Hat Enterprise Linux 7 Kernel Administration Guide: dracut initramfs regeneration - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/kernel_administration_guide/ch-manually_upgrading_the_kernel
- efibootmgr man page - https://www.mankier.com/8/efibootmgr

## Issues Found
- The GRUB rescue example implied the selected partition was the one containing `/boot`, but then used `/grub2` as the prefix. This is only correct when `/boot` is a separate partition. I changed the wording to find the GRUB files and added both common prefix forms: `/grub2` for a separate `/boot` partition and `/boot/grub2` when `/boot` is a directory on the root partition.
- The post stated that UEFI systems always regenerate GRUB configuration at `/boot/efi/EFI/redhat/grub.cfg`. That is correct for RHEL 8 and earlier, but RHEL 9 and later use `/boot/grub2/grub.cfg` for both BIOS and UEFI, with the EFI path acting as a stub that should not be regenerated with `grub2-mkconfig`. I added the version-specific distinction.
- The rescue environment section used `/mnt/sysimage`. RHEL 8 and later documentation uses `/mnt/sysroot`, which aligns with the post's use of `dnf` and current RHEL recovery procedures. I updated the mount and `chroot` path.

## Review Notes
The commands assume x86_64 BIOS or UEFI systems and that `/dev/sda` and EFI partition `1` are the correct target devices. In real recovery work, those device names should be confirmed before running bootloader installation or `efibootmgr` commands.
