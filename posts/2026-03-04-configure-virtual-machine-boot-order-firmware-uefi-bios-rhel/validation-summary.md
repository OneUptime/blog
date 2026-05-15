# Validation Summary: How to Configure Virtual Machine Boot Order and Firmware (UEFI/BIOS) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- KVM/QEMU virtualization
- libvirt domain XML
- virt-install
- virsh
- SeaBIOS
- OVMF/UEFI
- Secure Boot
- GPT and BIOS boot partitioning

## Sources Consulted
- Red Hat Enterprise Linux 9 virtualization documentation: Creating a SecureBoot virtual machine - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_and_managing_virtualization/diagnosing-virtual-machine-problems_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 virtualization documentation: Windows VM UEFI prerequisites - https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/installing-and-managing-windows-virtual-machines-on-rhel_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 storage documentation: GUID partition table and BIOS boot partition requirements - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/disk-partitions_managing-storage-devices
- Red Hat Enterprise Linux 9 Kickstart documentation: required platform partitions - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/kickstart-commands-and-options-reference_rhel-installer
- libvirt Domain XML format: firmware, loader, NVRAM, and boot order elements - https://libvirt.org/formatdomain.html
- libvirt Secure Boot knowledge base - https://libvirt.org/kbase/secureboot.html
- virt-install manual: UEFI and Secure Boot boot options - https://www.mankier.com/1/virt-install

## Issues Found
- The introduction said UEFI is required for GPT disk layouts larger than 2 TB. This was too broad: RHEL documentation says BIOS systems can boot from GPT disks when a BIOS boot partition is present. Updated the wording to state that UEFI is commonly used with GPT for large disks, but BIOS boot from GPT is possible with the required BIOS boot partition.
- The Secure Boot example used `--boot uefi,loader.secure=yes`. libvirt documents that the loader `secure` attribute indicates firmware capability and does not by itself enable Secure Boot enforcement. RHEL documentation recommends using the Secure Boot NVRAM template. Updated the command to use `--boot uefi,nvram_template=/usr/share/OVMF/OVMF_VARS.secboot.fd`.
- The Secure Boot example did not explicitly request the Q35 machine type, which RHEL lists as a Secure Boot prerequisite. Added `--machine q35`.
- The BIOS-to-UEFI conversion section said reinstalling the guest OS is required and that existing BIOS VMs cannot be converted without reinstalling. This was too absolute because conversion can be possible with guest bootloader and partitioning changes. Updated the language to say reinstalling is often the simplest approach.
- The conversion section described `virsh undefine` as deleting the VM. `virsh undefine` removes the libvirt domain definition and does not necessarily remove storage. Updated the comment to say it undefines the old VM configuration.

## Review Notes
The remaining examples use standard libvirt XML boot elements and per-device boot order syntax. Exact OVMF file paths and machine aliases can vary by RHEL and libvirt/QEMU package version, so future updates could mention checking `virsh domcapabilities` for host-specific firmware paths.
