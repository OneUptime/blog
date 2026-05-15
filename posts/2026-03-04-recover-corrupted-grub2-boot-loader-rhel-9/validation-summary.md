# Validation Summary: How to Recover a Corrupted GRUB2 Boot Loader on RHEL

## Status
validated

## Post Type
Tutorial / recovery guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GRUB2
- BIOS and UEFI boot recovery
- RHEL rescue environment
- dracut initramfs generation
- EFI System Partition tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using rescue mode and reinstalling the GRUB boot loader, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/troubleshooting-after-installation_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Reinstalling and resetting GRUB, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_monitoring_and_updating_the_kernel/updating-the-secure-boot-revocation-list_managing-monitoring-and-updating-the-kernel
- GNU GRUB Manual: rescue shell and normal mode commands, https://www.gnu.org/software/grub/manual/grub/grub.html
- Red Hat Enterprise Linux documentation: dracut initramfs regeneration examples, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/sec-verifying_the_initial_ram_disk_image
- Local command availability/help checks for `efibootmgr` and `dosfsck`

## Issues Found
- The post used `/mnt/sysimage` as the rescue chroot path. RHEL 9 rescue mode mounts the target system at `/mnt/sysroot` for chroot use, so the booting and chroot examples were corrected to `/mnt/sysroot`.
- The UEFI `grub2-mkconfig` command wrote to `/boot/efi/EFI/redhat/grub.cfg`. In RHEL 9, Red Hat documents `/boot/grub2/grub.cfg` as the correct output path for both BIOS and UEFI; the UEFI path is a stub file and must not be recreated with `grub2-mkconfig`. Both UEFI examples were corrected.
- The UEFI package reinstall examples used architecture-specific package names. Red Hat's RHEL 9 GRUB reinstall documentation uses `grub2-efi` and `shim`, so the examples were changed to those package names.
- The GRUB rescue example set only `root` before loading `normal`. The GNU GRUB manual's rescue guidance also sets `prefix` so GRUB can find its modules and configuration; the example now includes `set prefix=(hd0,msdos1)/boot/grub2`.
- The live USB fallback section showed only BIOS-style `grub2-install /dev/sda`. A UEFI-specific branch was added using EFI package reinstall and the RHEL 9 `grub2-mkconfig` path.

## Review Notes
The post is technically relevant and useful after the corrections. Device names such as `/dev/sda`, `/dev/sda1`, and `/dev/mapper/rhel-root` remain examples and must be adjusted for the target system. Reformatting an EFI System Partition with `mkfs.vfat` is destructive and should only be done after confirming the correct partition and having backups.
