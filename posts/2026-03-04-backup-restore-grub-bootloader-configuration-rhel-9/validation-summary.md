# Validation Summary: How to Backup and Restore the GRUB Bootloader Configuration on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GRUB 2
- Boot Loader Specification entries
- tar
- rsync
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Reinstalling and resetting GRUB: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/assembly_reinstalling-grub_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: Changing boot entries with the GRUB configuration file: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_monitoring_and_updating_the_kernel/index
- GNU tar local command help: `tar --help`
- rsync local command help: `rsync --help`

## Issues Found
- The original post claimed to explain GRUB bootloader configuration backup and restore, but its commands backed up the entire root filesystem instead of GRUB configuration. I replaced the generic full-system `tar` and `rsync` examples with commands that back up `/etc/default/grub`, `/etc/sysconfig/grub`, `/etc/grub.d`, `/boot/grub2`, and `/boot/loader/entries`.
- The original post did not include a GRUB restoration command. I added a restore example that extracts the backup to `/` and rebuilds the generated GRUB configuration with `grub2-mkconfig -o /boot/grub2/grub.cfg`.
- The original post did not mention the RHEL 9 UEFI caveat. I added a note that `grub2-mkconfig` should use `/boot/grub2/grub.cfg` for both BIOS and UEFI systems, and that `/boot/efi/EFI/redhat/grub.cfg` is a UEFI stub file that should not be regenerated.
- The cron example referenced a generic `/usr/local/bin/backup.sh`. I changed it to `/usr/local/bin/grub-backup.sh` and `/etc/cron.d/grub-backup` to match the GRUB-specific task.

## Review Notes
The restored configuration should be tested in a non-production environment before relying on it for disaster recovery. If bootloader packages or boot files are missing or damaged, Red Hat documents separate GRUB reinstall procedures for BIOS and UEFI systems.
