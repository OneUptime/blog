# Validation Summary: How to Configure GRUB2 for UEFI and Legacy BIOS Systems on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GRUB 2
- UEFI and legacy BIOS boot
- EFI System Partition and EFI boot entries
- Secure Boot, shim, and MOK tooling
- grubby kernel command-line management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Reinstalling GRUB": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/assembly_reinstalling-grub_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation, "Configuring kernel command-line parameters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 documentation, "Signing a kernel and modules for Secure Boot": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/signing-a-kernel-and-modules-for-secure-boot_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation, "Automatically installing RHEL" partition reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Local command help for `efibootmgr` version 18 and `mokutil`

## Issues Found
- The post repeatedly said RHEL UEFI systems should regenerate `/boot/efi/EFI/redhat/grub.cfg`. For RHEL 9, Red Hat documents `/boot/grub2/grub.cfg` as the generated GRUB configuration path for both BIOS and UEFI, and warns that the UEFI path is a stub that must not be recreated with `grub2-mkconfig`. I updated the diagram, comparison table, UEFI reinstall example, timeout example, detection script, troubleshooting example, and wrap-up text.
- The UEFI package reinstall command used architecture-specific package names, `grub2-efi-x64` and `shim-x64`. Red Hat's RHEL 9 GRUB reinstall procedure documents reinstalling `grub2-efi` and `shim`, so I changed the command and package table to those documented package names.
- The partition scheme table implied BIOS means MBR only. RHEL supports BIOS boot from GPT when a BIOS boot partition is present, so I changed the BIOS entry to "MBR or GPT with a BIOS boot partition."
- The UEFI boot partition row implied `/boot/efi` is the only boot partition. I clarified that UEFI systems use `/boot` plus the `/boot/efi` EFI System Partition.

## Review Notes
The remaining commands are broadly accurate for the stated RHEL 9 scope. The exact boot disk, ESP partition number, and EFI boot entry number in examples such as `/dev/sda`, `-p 1`, and `0003` remain environment-specific and should be adjusted by readers on real systems.
