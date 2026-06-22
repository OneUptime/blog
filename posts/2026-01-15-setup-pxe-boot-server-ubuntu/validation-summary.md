# Validation Summary: How to Set Up a PXE Boot Server on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Server
- PXE network boot
- TFTP and tftpd-hpa
- ISC DHCP Server
- Syslinux/PXELINUX
- Apache HTTP Server
- Ubuntu Subiquity autoinstall
- cloud-init NoCloud datasource
- UFW firewall
- Rocky Linux network installation

## Sources Consulted
- Ubuntu Subiquity autoinstall reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
- cloud-init NoCloud datasource reference: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- Ubuntu live server netbooting guide: https://discourse.ubuntu.com/t/netbooting-the-live-server-installer/14510
- Ubuntu 22.04 release index: https://releases.ubuntu.com/22.04/
- ISC DHCP 4.4 dhcp-options manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- RFC 4578, DHCP PXE client architecture options: https://datatracker.ietf.org/doc/html/rfc4578
- Debian tftpd-hpa manual page: https://manpages.debian.org/testing/tftpd-hpa/tftpd.8.en.html
- Ubuntu package metadata and package contents for `pxelinux`, `syslinux-common`, `syslinux-efi`, `tftpd-hpa`, `tftp-hpa`, `isc-dhcp-server`, `apache2`, and `whois` via `apt-cache`, `apt-get download`, and `dpkg-deb`.
- ISC DHCP configuration syntax check using `dhcpd -t` from the Ubuntu `isc-dhcp-server` package.

## Issues Found
- The architecture diagram showed the client downloading the kernel and initrd from HTTP, but the provided PXELINUX menu loads them from TFTP. Updated the diagram so TFTP serves the kernel/initrd and HTTP serves the ISO/autoinstall files.
- The package install commands omitted `tftp-hpa`, which is needed for the later `tftp localhost` client test, and `whois`, which provides `mkpasswd` on Ubuntu. Added both packages.
- The UEFI Syslinux copy command only copied `*.e64`, which misses required EFI `.c32` modules such as `menu.c32`. Updated the commands to copy all files from `/usr/lib/syslinux/modules/efi64/`.
- The ISC DHCP examples used `option architecture-type` without declaring DHCP option 93. Added `option architecture-type code 93 = unsigned integer 16;` and verified the resulting syntax with `dhcpd -t`.
- The UEFI DHCP condition only mentioned architecture type `00:07` in one place. Updated the example to handle both common x86-64 UEFI architecture values `00:07` and `00:09`.
- The Ubuntu 22.04 ISO URL and PXE menu used an older point-release filename. Updated the examples to `ubuntu-22.04.5-live-server-amd64.iso`, which is the current 22.04 live-server ISO listed on the Ubuntu release index.
- The autoinstall kernel argument used the older `ds=nocloud-net` form. Updated it to the current documented `ds=nocloud;s=...` NoCloud line configuration.
- The autoinstall locale example used `en_US`; updated it to the documented default `en_US.UTF-8`.
- The Apache section enabled proxy modules that are not required to serve static files from `/var/www/html`. Replaced that with enabling and starting Apache.

## Review Notes
ISC DHCP is end-of-life upstream, although it remains packaged in Ubuntu 24.04. Future revisions could mention Kea DHCP for new deployments. The memtest menu entry assumes the referenced `images/memtest/memtest86+.bin` file has been added separately; the post does not currently include preparation steps for that optional entry.
