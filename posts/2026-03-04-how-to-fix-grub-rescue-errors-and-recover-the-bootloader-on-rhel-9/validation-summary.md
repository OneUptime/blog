# Validation Summary: How to Fix 'GRUB Rescue' Errors and Recover the Bootloader on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GNU GRUB 2
- RHEL rescue mode
- UEFI and BIOS bootloaders
- dracut initramfs regeneration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Reinstalling GRUB: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/assembly_reinstalling-grub_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: Considerations in adopting RHEL 9, GRUB configuration file changes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/index
- Red Hat Enterprise Linux 9 documentation: Using rescue mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/troubleshooting-after-installation_rhel-installer
- GNU GRUB Manual: GRUB only offers a rescue shell: https://www.gnu.org/software/grub/manual/grub/html_node/GRUB-only-offers-a-rescue-shell.html
- Red Hat Enterprise Linux 9 documentation: Security hardening examples using `dracut --regenerate-all`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening

## Issues Found
- The UEFI `grub2-mkconfig` command wrote to `/boot/efi/EFI/redhat/grub.cfg`. In RHEL 9, that file is a stub that loads `/boot/grub2/grub.cfg` and should not be recreated with `grub2-mkconfig`. Changed the UEFI command to write `/boot/grub2/grub.cfg`.
- The UEFI package reinstall example used architecture-specific package names. Red Hat's RHEL 9 documentation uses `grub2-efi` and `shim`, so the command was changed to `dnf reinstall grub2-efi shim`.
- The GRUB rescue example only checked `/grub2/`, which is correct when the selected partition is `/boot` but not when `/boot` is part of the root filesystem. Added the `/boot/grub2/` check and matching `prefix` example.
- The missing boot partition repair example used `grub2-install /dev/sda` without limiting it to BIOS systems. Red Hat warns that `grub2-install` can break Secure Boot UEFI systems because it installs an unsigned GRUB image. Scoped that command to BIOS systems and added the UEFI package reinstall command instead.

## Review Notes
The commands still use example device names such as `/dev/sda` and `/dev/sda1`; readers must replace them with the actual boot disk and boot partition for their system.
