# Validation Summary: How to Configure Virtual Machine Boot Order and Firmware (UEFI/BIOS) on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM/QEMU virtualization
- libvirt domain XML
- virsh
- virt-install
- OVMF/UEFI firmware
- SeaBIOS/BIOS firmware
- Secure Boot

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing virtualization, Creating a SecureBoot virtual machine: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/securing-virtual-machines-in-rhel_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Installing and managing Windows virtual machines, UEFI and edk2-ovmf prerequisites: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/installing-and-managing-windows-virtual-machines-on-rhel_configuring-and-managing-virtualization
- libvirt Domain XML format, operating system booting and per-device boot order: https://www.libvirt.org/formatdomain
- libvirt virsh command reference, `start` command syntax: https://www.libvirt.org/manpages/virsh.html
- virt-install manual page, `--boot uefi` and Secure Boot firmware feature options: https://man.archlinux.org/man/virt-install.1
- libvirt Secure Boot knowledge base: https://libvirt.org/kbase/secureboot.html

## Issues Found
- The BIOS/UEFI table stated that BIOS means MBR and UEFI means GPT as absolute disk schemes. Changed this to "Typical disk scheme" and clarified the boot disk limit is tied to MBR or GPT rather than the firmware alone.
- The Secure Boot `virt-install` example enabled only the `secure-boot` firmware feature. For RHEL 9, Red Hat documents using `--boot uefi,nvram_template=/usr/share/OVMF/OVMF_VARS.secboot.fd` to select the Secure Boot variable template, so the command was updated.
- The post used `sudo virsh start vmname --boot cdrom`, but the official `virsh start` syntax does not include a `--boot` option. The section was changed to instruct editing the VM XML boot order instead.
- The BIOS-to-UEFI conversion explanation said direct conversion is unsupported because UEFI requires GPT. This was too absolute, so it now explains that conversion is not just a firmware setting change and requires an EFI System Partition and UEFI boot loader configuration.

## Review Notes
The libvirt XML examples for global `<boot dev='...'>` order and per-device `<boot order='...'>` order match the documented XML format. libvirt notes that global boot elements and per-device boot elements are mutually exclusive, which could be a useful future caveat if the post is expanded.
