# Validation Summary: How to Backup and Restore the GRUB Bootloader Configuration on RHEL

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Red Hat Enterprise Linux
- GRUB 2
- BIOS and UEFI boot modes
- Rescue mode
- cron
- GNU coreutils `dd`

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, Chapter 26: Working with GRUB 2: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-working_with_the_grub_2_boot_loader
- Red Hat Enterprise Linux 8 Managing, monitoring, and updating the kernel, Chapter 8: Building a customized boot menu: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_building-a-customized-boot-menu_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 Managing, monitoring, and updating the kernel, Configuring kernel command-line parameters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9, boot loader configuration layout changes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/considerations_in_adopting_rhel_9
- Red Hat Enterprise Linux 8 Installation Guide, troubleshooting and reinstalling GRUB boot loader from rescue mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/interactively_installing_rhel_from_installation_media/troubleshooting-after-installation_rhel-installer
- Red Hat Enterprise Linux 10 Installation Guide, troubleshooting after installation and rescue mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/interactively_installing_rhel_from_installation_media/troubleshooting-after-installation
- GNU coreutils `dd` documentation: https://www.gnu.org/software/coreutils/dd

## Issues Found
- The post treated `/boot/efi/EFI/redhat/grub.cfg` as the UEFI GRUB configuration target for all RHEL versions. Red Hat documents this layout for RHEL 7/8, but RHEL 9 unified GRUB configuration under `/boot/grub2/grub.cfg`, with the EFI file only loading that configuration. I changed the UEFI backup and restore comments to specify RHEL 7/8.
- The rescue mode section said the installed system is mounted at `/mnt/sysimage`, which is accurate for RHEL 7 rescue documentation but not for newer RHEL releases, which document `/mnt/sysroot`. I updated the comment and example chroot path for RHEL 8+ while noting the RHEL 7 path.
- The cron example appended directly to `/var/spool/cron/root`. The command is syntactically plausible, but using `crontab` is the supported interface and avoids direct spool-file editing issues. I replaced it with a `crontab -l` plus `crontab -` pipeline.

## Review Notes
The `dd` examples are syntactically valid for backing up the first 512 bytes and first 1 MiB of a selected disk, but `/dev/sda` is only an example device. Users should confirm the boot disk before running backup or restore commands.
