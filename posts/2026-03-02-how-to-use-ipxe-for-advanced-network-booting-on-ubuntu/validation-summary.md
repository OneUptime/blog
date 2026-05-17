# Validation Summary: How to Use iPXE for Advanced Network Booting on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iPXE (open-source network boot firmware)
- Traditional PXE
- tftpd-hpa (TFTP server)
- ISC DHCP server (dhcpd)
- Nginx (web server)
- Ubuntu 24.04 (casper-based live boot)
- memtest86+
- ufw firewall

## Sources Consulted
- Official iPXE documentation: https://ipxe.org/
- iPXE command reference: https://ipxe.org/cmd
- iPXE settings reference: https://ipxe.org/cfg
- iPXE SMBIOS settings: https://ipxe.org/cfg/smbios
- Ubuntu package contents for `ipxe` (noble): https://packages.ubuntu.com/noble/all/ipxe/filelist
- iPXE source on GitHub: https://github.com/ipxe/ipxe
- DHCP option 93 (Client System Architecture) values: RFC 4578
- Ubuntu live boot (casper) ISO layout (24.04)
- ISC DHCP `dhcpd.conf` conditional/`option arch` syntax

## Issues Found

1. **Incorrect filename `ipxe.pxe` in installed-files list.** The Ubuntu `ipxe` package does not install a file named `ipxe.pxe`; the actual files include `ipxe.lkrn`, `undionly.kpxe`, `ipxe.efi`, `snponly.efi`, `ipxe.iso`, and `ipxe.usb`. Replaced the bullet with `ipxe.lkrn` (the Linux kernel image format used to chainload iPXE from GRUB/SYSLINUX), which is the closest factually correct entry.

2. **Wrong initrd filename in `:ubuntu-live` block.** The script referenced `${base-url}/initrd.img`, but Ubuntu casper-based live ISOs ship the initrd as `casper/initrd` (no `.img` extension). The post's own later mount/copy step uses `/mnt/casper/initrd`, so the original was internally inconsistent. Changed `initrd.img` to `initrd`.

3. **Unquoted multi-word argument to `iseq`.** The line `iseq ${manufacturer} Dell Inc. && goto dell-boot ||` passes three tokens to `iseq`, which expects exactly two operands; iPXE would either error or silently compare only against `Dell`. Wrapped `"Dell Inc."` in double quotes so iPXE parses it as a single argument. The `HP` line was left alone since it contains no whitespace.

## Review Notes

- The `${manufacturer}` setting reference is correct: iPXE's SMBIOS settings module registers `manufacturer`, `product`, etc., as named settings, so unprefixed lookups resolve to the SMBIOS values. Using `${smbios/manufacturer}` would also work and is sometimes preferred for clarity.
- The ISC DHCP snippet does not show defining `option arch code 93 = unsigned integer 16;` first. In a real `dhcpd.conf`, this declaration is required before `if option arch = 00:07` can be used. The post implies the reader is merging into an existing config; this is acceptable but worth knowing.
- `choose --timeout 30000` uses milliseconds (30s), which matches iPXE's documented behavior.
- `tftp 192.168.1.10 -c get undionly.kpxe` is valid syntax for the `tftp-hpa` client.
- Real Dell SMBIOS manufacturer strings are commonly `Dell Inc.`, so the example value is realistic. HP strings vary across vendor mergers (`HP`, `Hewlett-Packard`, `HPE`) — readers comparing real hardware may need to widen the match.
- For Ubuntu 24.04 casper booting over HTTP via the `url=` parameter, the kernel must match the ISO version; mixing kernels and ISOs from different releases will fail with checksum/squashfs errors. Not a bug in the post, just a deployment caveat.
- `memtest86+` distribution has shifted toward EFI binaries in recent (6.x) releases; the `.bin` legacy multiboot image still works for BIOS network boot but readers on UEFI-only fleets may need a different artifact.
