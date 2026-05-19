# Validation Summary: How to Reset the GRUB Bootloader on Ubuntu

## Status
validated

## Post Type
Tutorial / Recovery Guide

## Technologies Covered
- GRUB 2 bootloader
- Ubuntu (live USB recovery workflow)
- chroot
- LVM2 (`vgchange`, `lvs`, `pvs`, `vgs`)
- LUKS / `cryptsetup`
- UEFI / `efivarfs` / `efibootmgr`
- `grub-install`, `update-grub` (`grub-mkconfig`), `grub-script-check`
- `os-prober` (dual-boot detection)
- `lsblk`, `fdisk`, `mount --bind`

## Sources Consulted
- `grub-install(8)` Ubuntu manpage — https://manpages.ubuntu.com/manpages/jammy/man8/grub-install.8.html
- `efibootmgr(8)` Ubuntu manpage — https://manpages.ubuntu.com/manpages/jammy/man8/efibootmgr.8.html
- GNU GRUB Manual — https://www.gnu.org/software/grub/manual/grub/grub.html
- Ubuntu Community help: GrubHowto / Grub2 — https://help.ubuntu.com/community/Grub2/Installing

## Issues Found
- **Misleading "verification" step under "For BIOS/Legacy Systems".** The original post used `grub-install --version` with the comment `# Verify installation`. Per `grub-install(8)`, `--version` only prints the program version; it does not validate that GRUB was successfully written to disk. Replaced with `ls /boot/grub/i386-pc/` which actually confirms the BIOS GRUB core files (e.g. `boot.img`, `core.img`, modules) were placed on the system by `grub-install /dev/sda`.

## Review Notes
- All other commands and flags verified against official documentation:
  - `grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu` is the canonical Ubuntu UEFI invocation.
  - `--no-nvram` is a real flag for EFI/IEEE1275 targets and behaves as described.
  - `efibootmgr --create --disk /dev/sda --part 1 --label "Ubuntu" --loader '\EFI\ubuntu\grubx64.efi'` is correct; backslash path notation is the EFI convention and the long flags are all documented.
  - The GRUB rescue sequence (`ls`, `set root=`, `set prefix=`, `insmod normal`, `normal`) matches the GNU GRUB manual.
  - The bind mounts (`/dev`, `/dev/pts`, `/proc`, `/sys`, `/sys/firmware/efi/efivars`) are the standard chroot prerequisites.
- The grub rescue example uses `(hd0,msdosN)` notation, which assumes an MBR-partitioned disk. UEFI/GPT systems use `(hd0,gptN)` instead. This is correct given the post pairs it with a legacy/MBR scenario, but a future revision could mention the GPT variant for completeness.
- "GRUB stage 1 / stage 2" terminology used in the symptoms list is a slight oversimplification — GRUB 2 uses `boot.img`/`core.img`/modules rather than the older stage1/stage2 split — but the descriptive intent is accurate and widely understood.
- `apt install --reinstall linux-image-$(uname -r)` caveat (that `uname -r` returns the live kernel inside chroot) is correctly noted and the recommended `dpkg --list | grep linux-image` workaround is sound.
- Example partition layout (sda1 EFI 512M / sda2 /boot 1G / sda3 root 498.5G) is realistic for current Ubuntu installers.
