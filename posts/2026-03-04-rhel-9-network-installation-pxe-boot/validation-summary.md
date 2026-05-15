# Validation Summary: How to Perform a Network-Based Installation of RHEL Using PXE Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- PXE boot
- DHCP / dhcpd
- TFTP / tftp-server
- Apache HTTP Server
- SYSLINUX / pxelinux
- GRUB UEFI boot
- Kickstart
- SELinux contexts
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Interactively installing RHEL over the network - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/interactively_installing_rhel_over_the_network/index
- Red Hat Enterprise Linux 9 documentation: Automatically installing RHEL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat Enterprise Linux 9 documentation: Boot options for RHEL Installer - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/boot_options_for_rhel_installer/index
- RFC 4578: Dynamic Host Configuration Protocol (DHCP) Options for the Intel Preboot eXecution Environment (PXE) - https://www.rfc-editor.org/rfc/rfc4578

## Issues Found
- The PXE flow diagram showed the client downloading `vmlinuz` and `initrd.img` over HTTP, but the tutorial's configuration serves those files from the TFTP tree. Updated the diagram to show TFTP serving the kernel and initrd.
- The BIOS boot file layout copied `pxelinux.0` and `ldlinux.c32` into the TFTP root and used `/var/lib/tftpboot/pxelinux.cfg/default`. Red Hat's documented RHEL 9 layout places SYSLINUX files under `/var/lib/tftpboot/pxelinux/`, with the configuration under `/var/lib/tftpboot/pxelinux/pxelinux.cfg/`. Updated the copy commands, kernel/initrd paths, BIOS config path, and DHCP filename.
- The UEFI section copied `shimx64.efi` and `grubx64.efi` from `/boot/efi/EFI/redhat/`, which may not exist or match the installer media on a PXE server. Red Hat documents copying the EFI boot tree from the RHEL DVD ISO. Updated the commands to copy the ISO's `EFI` directory into the TFTP tree.
- The UEFI GRUB example used `linuxefi` and `initrdefi`. Current RHEL 9 documentation uses GRUB `linux` and `initrd` in PXE GRUB configuration examples. Updated the GRUB commands and matching kernel/initrd paths.
- The DHCP snippet pointed UEFI clients to `uefi/shimx64.efi` and BIOS clients to `pxelinux.0`. Updated it to match the corrected TFTP layout: `redhat/EFI/BOOT/BOOTX64.EFI` for UEFI and `pxelinux/pxelinux.0` for BIOS.
- The Kickstart BIOS example still wrote to the old `pxelinux.cfg/default` path. Updated it to `/var/lib/tftpboot/pxelinux/pxelinux.cfg/default`.

## Review Notes
- The `inst.repo=` and `inst.ks=` boot options are valid for RHEL 9, and Red Hat documents that the `inst.repo=` target must contain a valid `.treeinfo` file.
- RFC 4578 confirms DHCP option 93 is the PXE client system architecture type option, with type 0 for Intel x86PC, type 7 for EFI BC, and type 9 for EFI x86-64.
- Red Hat documents a GRUB compatibility caveat for extracted RHEL 9.5 and later AArch64 `vmlinuz` files. This post uses an x86_64 RHEL 9.4 example, so no change was required.
