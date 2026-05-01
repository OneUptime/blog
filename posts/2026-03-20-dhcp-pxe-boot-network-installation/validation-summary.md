# Validation Summary: How to Use DHCP with PXE Boot for Network Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP
- PXE boot
- ISC DHCP (`dhcpd`)
- TFTP (`tftpd-hpa`)
- PXELINUX / Syslinux
- Ubuntu Server 22.04 PXE installation
- HTTP-based installer asset delivery

## Sources Consulted
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132
- RFC 4578, DHCP Options for PXE: https://www.rfc-editor.org/rfc/rfc4578
- Ubuntu Server documentation, netboot the server installer on amd64: https://ubuntu.com/server/docs/how-to/installation/how-to-netboot-the-server-installer-on-amd64/
- Ubuntu Server documentation, UEFI PXE netboot: https://ubuntu.com/server/docs/how-to/installation/netboot-the-server-installer-via-uefi-pxe-on-arm-aarch64-arm64-and-x86-64-amd64/
- Ubuntu 22.04.5 live-server ISO download: https://releases.ubuntu.com/jammy/ubuntu-22.04.5-live-server-amd64.iso

## Issues Found
- The post described `next-server` as DHCP option 66 and `filename` as option 67. I corrected this because the guide uses the BOOTP/DHCP boot parameters `next-server` and `filename`; RFC 2132 defines options 66 and 67 separately as the TFTP server name and bootfile name options.
- The DHCP example tried to detect UEFI clients using `vendor-class-identifier` and serve `shimx64.efi`. I removed that because the matching logic was too broad and `shimx64.efi` is not the standard Ubuntu UEFI PXE loader documented by Canonical. The example now accurately shows the legacy BIOS `pxelinux.0` flow that the rest of the post configures.
- The TFTP setup copied only `ldlinux.c32`, `menu.c32`, and `vesamenu.c32`. I added `libcom32.c32` and `libutil.c32`, which are required for Syslinux menu modules.
- The PXE menu used a preseed-style Ubuntu 22.04 install stanza. I replaced it with the supported Ubuntu 22.04 live-server PXE pattern: boot `vmlinuz` and `initrd` via TFTP and fetch the live-server ISO over HTTP.
- The Jammy `legacy-images/netboot/netboot.tar.gz` URL in the post is no longer valid. I replaced that section with a supported 22.04 flow based on the official live-server ISO, including extracting `vmlinuz` and `initrd` from the ISO and serving the ISO over HTTP.
- The closing note about unattended installs referenced preseed/kickstart generically. I updated it to Ubuntu `autoinstall`, which is the correct unattended installation mechanism for Ubuntu Server 22.04.

## Review Notes
- The post now validates as a legacy BIOS PXE example using `pxelinux.0`. UEFI PXE for Ubuntu 22.04 requires a different loader and GRUB-based configuration, which is mentioned in the corrected takeaways but not fully implemented in this post.
- ISC DHCP remains technically relevant for the example, but ISC has declared the legacy ISC DHCP codebase end-of-life in favor of Kea. The configuration shown is still valid for environments that continue to use `dhcpd`.
