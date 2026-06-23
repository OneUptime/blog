# Validation Summary: How to Create a Bootable USB Drive on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- `dd` and core GNU coreutils (`sync`, `eject`, `head`, `cmp`, `stat`)
- `lsblk`, `fdisk`, `parted`, `wipefs`, `badblocks`, `mkfs.ext4`, `mkfs.fat`, `mkfs.ntfs`
- Ubuntu Startup Disk Creator (`usb-creator-gtk` / `usb-creator-kde`)
- balenaEtcher (AppImage, Cloudsmith APT repo, Flatpak)
- Ventoy (`Ventoy2Disk.sh`, `ventoy.json`)
- GNOME Disks (`gnome-disks`)
- WoeUSB / woeusb-ng, wimlib (`wimlib-imagex`) for Windows USBs
- UEFI/Legacy boot, GPT/MBR, Secure Boot, persistence (`casper-rw`, `persistence.conf`)
- QEMU/OVMF for boot testing
- Checksum/GPG verification (`sha256sum`, `gpg`)

## Sources Consulted
- balenaEtcher on Flathub — app ID `io.balena.etcher` (https://github.com/balena-io/etcher/issues/3785, https://discourse.flathub.org/t/balenaetcher-please/5387)
- Cloudsmith balena/etcher APT repository setup and package names (https://cloudsmith.io/~balena/repos/etcher/setup/, https://cloudsmith.io/~balena/repos/etcher/packages/)
- etcher-cli deprecation notice (https://github.com/balena-io/etcher-cli)
- balenaEtcher snap availability (community-only) — snapcraft forum (https://forum.snapcraft.io/t/etcher-balenaetcher-iso-to-usb-stick-burning-tool/39882)
- Ventoy documentation: getting started and disk layout, `-r` preserve-space option (https://www.ventoy.net/en/doc_start.html, https://www.ventoy.net/en/doc_disk_layout.html)

## Issues Found
1. **Incorrect Flatpak application ID.** The post used `flatpak install flathub io.balena_etcher`. The correct Flathub app ID is `io.balena.etcher` (reverse-DNS, dotted). The original would fail to resolve. Fixed.
2. **Non-existent official Snap package.** The post instructed `sudo snap install balena-etcher` as an official install method. balenaEtcher is not published on the official Snap Store (only unofficial community ports exist), so this command fails. Removed the Snap method and added a note pointing readers to the AppImage / APT / Flatpak methods instead. Remaining methods were renumbered consistently.
3. **Outdated APT package name.** `balena-etcher-electron` is the legacy 1.x package name; current 2.x releases from the Cloudsmith repo use `balena-etcher`. Updated the install command to `balena-etcher` and noted the legacy name for older releases.
4. **Deprecated `etcher-cli`.** The post recommended `npm install -g etcher-cli` and `etcher ... --drive ...` for automation. The standalone `etcher-cli` npm package is deprecated and is not bundled with current balenaEtcher releases, so the snippet would not work. Replaced it with the recommended scripted approach (`dd`) for headless/automated writes.
5. **Inaccurate Ventoy `-r` description.** The comment claimed `-r` "reserves space for the boot partition." Per Ventoy docs, `-r SIZE_MB` preserves unused space at the *end* of the disk (for the user's own partition), not for the boot partition. Corrected the comment.

## Review Notes
- The core `dd` workflow, options (`bs`, `status=progress`, `conv=fsync`, `oflag=sync`, `oflag=direct`), checksum verification via `head -c`, and `cmp -n` are all accurate.
- Ventoy install/update flags (`-i`, `-u`, `-I`, `-g`, `-s`, `-r`) and the GUI binary `VentoyGUI.x86_64` are correct; the `ventoy.json` `control`/`theme`/`menu_alias`/`persistence` schema is valid.
- Boot-mode detection (`/sys/firmware/efi`, `fw_platform_size`, `efivar --list`), QEMU/OVMF testing (`qemu-system-x86`, `/usr/share/ovmf/OVMF.fd`), and the Windows-USB GPT/ESP + NTFS split-`install.wim` workflow (`wimlib-imagex split` → `.swm`) are all correct.
- Version-pinned download URLs (balenaEtcher 1.18.11, Ventoy 1.0.97) are illustrative; readers should check each project's releases page for the current version, as the post already advises for Ventoy. Left as-is since they are clearly examples.
- Persistence via a third `casper-rw`-labelled ext4 partition is a valid Ubuntu technique; note that on some setups the `persistent` kernel parameter must also be present, but the labelled-partition approach used here is the standard documented method.
