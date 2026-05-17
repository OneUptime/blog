# Validation Summary: How to Install Ubuntu Server Without a Monitor (Headless Install)

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu Server 24.04 (Noble Numbat) live installer / Subiquity
- Serial console (screen, minicom, picocom)
- IPMI / iDRAC / iLO BMC consoles (ipmitool, SOL)
- Ubuntu Autoinstall (cloud-init NoCloud datasource, curtin)
- xorriso / ISO repacking for Ubuntu 24.04
- Ubuntu cloud images (cloud-init, genisoimage seed ISO)
- QEMU/KVM (qemu-system-x86_64)
- PXE network boot (dnsmasq, TFTP, PXELINUX/syslinux)
- GRUB kernel command-line parameters

## Sources Consulted
- Canonical Subiquity autoinstall reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/autoinstall-quickstart.html
- Ubuntu Discourse — Please test autoinstalls for 20.04 (ISO repacking discussion): https://discourse.ubuntu.com/t/please-test-autoinstalls-for-20-04/15250
- Ubuntu cloud images repository: https://cloud-images.ubuntu.com/noble/
- Linux kernel serial console docs (`Documentation/admin-guide/serial-console.rst`) for `console=tty0 console=ttyS0,115200n8` semantics
- `ipmitool(1)` man page for `sol activate` and `chassis bootdev` subcommands
- cloud-init NoCloud datasource docs for `ds=nocloud-net;s=...` URL syntax
- PXELINUX / syslinux documentation for required `pxelinux.0` and `ldlinux.c32` files

## Issues Found

1. **IPMI section had a misleading comment.** The two commands (`chassis bootdev cdrom` + `power reset`) were labelled "Access BIOS/UEFI setup", which they do not do — they set the next boot device to virtual CD-ROM and reset the host. Updated the comment to accurately describe the action.

2. **ISO repack instructions were broken for Ubuntu 24.04.** The original `xorriso` command targeted the legacy isolinux-based layout (`isolinux/isolinux.bin`, `/usr/lib/ISOLINUX/isohdpfx.bin`, `boot/grub/efi.img`). The Ubuntu 24.04 server live ISO is GRUB-only and does not contain an `isolinux/` directory or `boot/grub/efi.img`, so the command would fail with missing-file errors. Replaced it with a `--grub2-mbr` / `-append_partition` hybrid command that matches the actual 24.04 ISO layout (`boot/grub/i386-pc/boot_hybrid.img`, `boot/grub/i386-pc/eltorito.img`, `EFI/boot/grubx64.efi`). Also removed the `isolinux` package from the `apt install` line since it is no longer needed.

3. **PXE section was missing the `url=` kernel parameter.** The casper-based live installer kernel/initrd cannot find the live filesystem on its own when booted over PXE — it needs a `url=http://.../<iso>.iso` parameter so the initrd can download and mount the ISO contents. Without it the boot would drop to an initramfs prompt. Added the `url=` parameter to the `APPEND` line and added a step to host the ISO over HTTP.

4. **PXE section was missing PXELINUX bootloader files.** The dnsmasq config points clients at `pxelinux.0`, but the post never installed `pxelinux` / `syslinux-common` or copied `pxelinux.0` and `ldlinux.c32` into the TFTP root, so the chain would fail at the first stage. Added those steps before the kernel/initrd copy.

## Review Notes

- The autoinstall YAML uses the (correct but commonly mis-typed) doubly-nested `network: network:` block; this matches Canonical's documented schema because the inner `network:` is the embedded netplan config.
- The Subiquity "SSH during install" description is slightly simplified — in practice you usually enable SSH access from the installer's Help menu, which then prints the one-time password for the `installer` user. The post's flow is broadly accurate and was left as-is.
- The PXE example uses BIOS-style PXELINUX. For UEFI clients, a separate GRUB netboot chain (`grubnetx64.efi.signed` + a network `grub.cfg`) would be required; this is out of scope but worth noting for readers with mixed BIOS/UEFI fleets.
- The `set timeout=0` instruction works but, combined with `quiet`, hides the GRUB menu entirely — a non-zero timeout (e.g. 1) is sometimes preferred so an admin can interrupt a misconfigured install.
- The QEMU example uses a raw `.img` cloud image without `format=qcow2`; QEMU autodetects the format here, but specifying `format=qcow2` explicitly is generally recommended to avoid warnings on newer QEMU versions.
