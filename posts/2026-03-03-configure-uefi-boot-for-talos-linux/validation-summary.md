# Validation Summary: How to Configure UEFI Boot for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.9.0)
- UEFI firmware and EFI System Partition (ESP)
- Secure Boot (PK/KEK/db/dbx key hierarchy)
- Unified Kernel Image (UKI) signing
- `talosctl` CLI
- `siderolabs/imager` (Docker image)
- `efibootmgr` (Linux EFI boot variable tool)
- `openssl` (key/cert generation and conversion)
- `pesign` (PE signature verification)
- PXE / iPXE network boot, ISC DHCP
- GPT partitioning

## Sources Consulted
- Talos Linux docs (v1.9 architecture): https://www.talos.dev/v1.9/learn-more/architecture/
- Talos Linux docs (disk management layout): https://www.talos.dev/v1.11/learn-more/architecture/
- Talos v1.9.0 GitHub release assets: https://github.com/siderolabs/talos/releases/tag/v1.9.0
- Talos imager / SecureBoot profile (discussion #9035): https://github.com/siderolabs/talos/discussions/9035
- Talos `--insecure` flag docs: https://www.talos.dev/v1.11/talos-guides/configuration/
- RFC 4578 (DHCPv4 PXE Client System Architecture types): https://datatracker.ietf.org/doc/html/rfc4578
- Sidero Omni PXE/iPXE registration guide: https://omni.siderolabs.com/

## Issues Found
1. **Incorrect partition sizes in the installer disk layout.** The post listed `EFI System Partition (260MB, FAT32)`, `META partition (variable)`, and `STATE partition (variable, encrypted)`. Talos's actual defaults are EFI ~100MB, META ~1MB, and STATE ~100MB (with disk encryption being opt-in, not on by default). Updated the layout block accordingly and clarified that the BIOS partition is for hybrid BIOS compatibility.

2. **Non-existent Talos signing certificate download URL.** The post instructed readers to `wget https://github.com/siderolabs/talos/releases/download/v1.9.0/talos-uki-signing-cert.der`. No such asset exists on the v1.9.0 release (only kernel/initramfs/iso/raw images, talosctl binaries, CNI bundles, and checksums are published). Replaced this with accurate guidance: either generate keys yourself (covered later in the post) or use the Image Factory (factory.talos.dev) for managed SecureBoot signing.

3. **Wrong filenames in OpenSSL conversion commands.** Updated to use generic `uki-signing-cert.{pem,der}` filenames since the prior `talos-uki-signing-cert.*` filenames were tied to the non-existent download.

4. **Imager CLI flags `--uki-signing-key-path` / `--uki-signing-cert-path` do not exist.** The `siderolabs/imager` configures SecureBoot signing through a profile YAML (with `secureBootSigner.keyPath` / `secureBootSigner.certPath`) piped to stdin, not via CLI flags. Replaced the `docker run` example with a correct profile-based invocation.

5. **`talosctl disks` is deprecated.** Updated `talosctl disks --insecure --nodes <NODE_IP>` to `talosctl get disks --insecure --nodes <NODE_IP>` (the COSI resource-based replacement).

## Review Notes
- The PXE DHCP architecture identifiers `00:07` and `00:09` are correct per RFC 4578 (EFI x64 and EFI BC). Matching both is the defensive pattern most setups use because client firmware reports vary.
- The `\EFI\systemd\systemd-bootx64.efi` loader path in the `efibootmgr` example is correct for systemd-boot, though Talos itself uses a UKI under `\EFI\Linux\` rather than systemd-boot — this example is presented as generic preparation guidance and is left as-is.
- `pesign -S -i` is the correct flag combination for displaying signatures on a PE binary.
- Talos v1.9.0 (released 2024-12-17) is a real release; readers on newer minor versions should bump the imager tag accordingly.
- Disk encryption for the STATE partition is configurable but not enabled by default; the original "encrypted" claim was overstated and was softened to "encryption optional".
