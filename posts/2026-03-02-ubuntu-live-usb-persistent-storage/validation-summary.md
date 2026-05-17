# Validation Summary: How to Create an Ubuntu Live USB with Persistent Storage

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ubuntu Live USB (casper / squashfs / overlayfs)
- `mkusb` (Ubuntu community USB creator)
- Ventoy multi-boot USB tool
- `dd`, `fdisk`, `parted`, `mkfs.ext4`, `e2fsck`, `resize2fs`
- GRUB boot loader configuration
- Linux kernel `persistent` boot parameter

## Sources Consulted
- Ubuntu community help: [mkusb wiki](https://help.ubuntu.com/community/mkusb) — package names (`mkusb` GUI, `mkusb-nox` no-X), PPA (`ppa:mkusb/ppa`), and `dus` launcher meaning
- Ubuntu community help: [LiveCDPersistence](https://help.ubuntu.com/community/LiveCDPersistence) — confirms `persistent` kernel parameter and required `casper-rw` label
- Ventoy documentation: [Persistence plugin](https://www.ventoy.net/en/plugin_persistence.html) — JSON schema for `persistence` array with `image` and `backend` fields
- [Ventoy GitHub releases](https://github.com/ventoy/Ventoy/releases) — current stable version (1.1.12 as of April 2026)

## Issues Found

1. **Misleading mkusb install comment.** Original text put the comment "# Install the GUI version (dus = do USB stuff)" directly above `sudo apt install mkusb-nox`, falsely implying `mkusb-nox` is the GUI. Per the Ubuntu wiki, `mkusb` is the GUI package (launched via `dus`), and `mkusb-nox` is the no-X / command-line variant. Reordered and re-commented so each package gets the correct description.

2. **Overstated "official Canonical-recommended" claim for mkusb.** mkusb is community-developed (by sudodus / Nio Wiklund) and documented on `help.ubuntu.com/community/mkusb` — it is not an official Canonical product. Softened the wording to "the tool recommended by the Ubuntu community help wiki."

3. **Outdated Ventoy version (1.0.97).** Latest stable Ventoy is 1.1.12 (April 2026). Updated the wget URL and tarball name, and added a reminder to check the releases page for the current version.

4. **Wrong device path when mounting USB to edit GRUB.** Original used `sudo mount /dev/sdX /mnt`, which targets the whole-disk device, not a filesystem. The USB's ISO9660 partition is `/dev/sdX1` on the mkusb layout described earlier. Changed to `sudo mount /dev/sdX1 /mnt` with a clarifying comment.

## Review Notes

- The `// /mnt/ventoy/ventoy.json` line above the JSON block is presentational (a file-path label) — Ventoy's parser does not accept JSON comments, but readers consistently interpret this style as out-of-band annotation, so it was left as-is.
- `df -h | grep casper-rw` in the "Checking Persistence Storage Usage" section will only match if the device path or mount point literally contains `casper-rw`; on a typical setup the overlay shows as `/cow` with device `/dev/sdX3`. The subsequent `mount | grep -E "casper|overlay"` is the more reliable check and is already provided, so left unchanged.
- The post lists the mkusb partition table as `/dev/sdX2` ext2 for casper-rw. Recent mkusb versions do create the casper-rw partition as ext2 by default for the "persistent live" install path, so this is accurate. Some other mkusb modes use ext4 — readers should not be surprised if their layout differs slightly.
- For Ubuntu releases newer than 22.04, the kernel parameter `persistent` is still honored by casper; no change needed.
- The "Kernel updates" limitation point is accurate: even though `apt` can install a new kernel into the overlay, the bootloader paths on the read-only ISO continue to reference the original kernel/initrd, so the new kernel will not be booted from the same USB.
