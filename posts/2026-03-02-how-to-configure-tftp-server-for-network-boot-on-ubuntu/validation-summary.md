# Validation Summary: How to Configure TFTP Server for Network Boot on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Server
- TFTP and tftpd-hpa
- PXE network boot
- Syslinux and PXELINUX
- UEFI boot with Syslinux EFI
- ISC DHCP Server
- UFW, iptables, and Linux netfilter connection tracking

## Sources Consulted
- RFC 1350: The TFTP Protocol (Revision 2): https://www.rfc-editor.org/rfc/rfc1350.html
- Debian tftpd-hpa man page for `in.tftpd`: https://manpages.debian.org/stretch/tftpd-hpa/tftpd.8.en.html
- Ubuntu Server documentation, "How to netboot the server installer on amd64": https://ubuntu.com/server/docs/how-to/installation/how-to-netboot-the-server-installer-on-amd64/
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- Syslinux package documentation from Ubuntu `syslinux-common` package (`pxelinux.txt`, `syslinux.cfg.txt`, `menu.txt`)
- Ubuntu package metadata and file lists for `tftpd-hpa`, `pxelinux`, `syslinux-common`, and `syslinux-efi`
- Linux Kernel Driver Database entry for `nf_conntrack_tftp`: https://cateee.net/lkddb/web-lkddb/NF_CONNTRACK_TFTP.html

## Issues Found
- The iptables example allowed UDP packets with source port 69, which does not correctly cover TFTP's negotiated transfer identifiers. Replaced it with an `ESTABLISHED,RELATED` conntrack rule and kept the `nf_conntrack_tftp` guidance.
- The Syslinux EFI bootloader path was incorrect for Ubuntu packages. Changed `/usr/lib/syslinux/efi64/syslinux.efi` to `/usr/lib/SYSLINUX.EFI/efi64/syslinux.efi`.
- The UEFI Syslinux files were copied into the same TFTP root as BIOS COM32 modules. Updated the commands to keep EFI files and EFI modules in an `efi64` directory to avoid mixing BIOS and EFI module formats.
- The Ubuntu 24.04 PXE menu used old installer/preseed-style kernel arguments (`auto=true priority=critical`) and only referenced the initrd. Updated it to use the live-server netboot arguments documented by Ubuntu, including `root=/dev/ram0`, `ramdisk_size=1500000`, `cloud-config-url=/dev/null`, `ip=dhcp`, and an ISO `url=`.
- The text said only the Ubuntu kernel and initrd were needed for network installation. Updated it to clarify that the live-server ISO must also be reachable over HTTP at the URL used in the PXE menu.
- The ISC DHCP example matched `option arch` without defining the custom option. Added the DHCP option 93 declaration and updated the architecture match to use the declared `client-arch` option.
- The DHCP UEFI filename pointed to `bootx64.efi` at the TFTP root even though the corrected EFI files are under `efi64`. Updated it to `efi64/bootx64.efi`.

## Review Notes
ISC DHCP is end-of-life upstream, but the example remains technically relevant because Ubuntu still packages `isc-dhcp-server`. For production UEFI PXE booting, Ubuntu's current documentation uses GRUB for UEFI; the post's Syslinux EFI approach can work but may need additional environment-specific testing.
