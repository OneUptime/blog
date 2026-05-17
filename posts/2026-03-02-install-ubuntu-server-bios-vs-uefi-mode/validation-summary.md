# Validation Summary: How to Install Ubuntu Server in BIOS vs UEFI Mode

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ubuntu Server (subiquity installer)
- BIOS (legacy firmware)
- UEFI (Unified Extensible Firmware Interface)
- GRUB / GRUB2 bootloader (`grub-install`, `update-grub`)
- MBR (Master Boot Record) partitioning
- GPT (GUID Partition Table) partitioning
- EFI System Partition (ESP) / FAT32
- `efibootmgr`
- `gdisk` / `sgdisk`
- `mkfs.fat`, `blkid`
- efivarfs (`/sys/firmware/efi/efivars`)
- VirtualBox / VMware firmware settings

## Sources Consulted
- UEFI Specification v2.10 (https://uefi.org/specifications) — GPT structure, ESP requirements, boot manager behavior
- GNU GRUB Manual (https://www.gnu.org/software/grub/manual/grub/grub.html) — install targets, i386-pc vs x86_64-efi
- Wikipedia: GUID Partition Table (https://en.wikipedia.org/wiki/GUID_Partition_Table) — 9.4 ZB max with 512-byte sectors, 128-entry default partition array, BIOS boot partition GUID
- Wikipedia: Master Boot Record (https://en.wikipedia.org/wiki/Master_boot_record) — 446-byte boot code area, 4-primary limit, 2 TB limit
- Ubuntu Server installation documentation (https://ubuntu.com/server/docs/installation)
- Arch Wiki: GRUB and Partitioning (https://wiki.archlinux.org/title/GRUB, https://wiki.archlinux.org/title/Partitioning) — install procedures, MBR→GPT conversion
- gdisk man page — recovery menu 'f' option ("load MBR partition table from disk and create GPT")
- efibootmgr man page — `-v` for verbose listing
- mkfs.fat (dosfstools) man page — `-F32` flag

## Issues Found
- **GPT maximum disk size**: The post stated GPT supports disks "up to 8 ZB". The commonly cited maximum, derived from the spec's 2^64 logical block address limit with 512-byte sectors, is ~9.4 ZB. Updated to "~9.4 ZB (with 512-byte sectors)" for accuracy.

## Review Notes
- The MBR structure description (446 bytes boot code, MBR gap for GRUB stage 1.5) is accurate.
- BIOS boot partition GUID `21686148-6449-6E6F-744E-656564454649` is correct per the GPT spec.
- The `grub-install` targets (`i386-pc` for BIOS, `x86_64-efi` for UEFI) and `--efi-directory` / `--bootloader-id` flags are correct.
- The `gdisk` "r → f" path (recovery menu → load MBR partition table and create GPT) is a valid conversion method. A simpler approach is to just open the disk in gdisk (which auto-converts in memory) and write with 'w', but the documented path is not wrong.
- The "538 MB" minimum EFI partition size for the Ubuntu Server installer is plausible — subiquity's default ESP size has varied across releases (256 MB, 512 MB, ~1 GB in newer versions). This value may be version-specific but is within the reasonable range; not flagged as an error.
- The note about UEFI/MBR — strictly, the UEFI spec allows booting from MBR disks, though GPT is strongly recommended and required for disks >2 TB. The post's phrasing is acceptable.
- The `mount --bind /sys/firmware/efi/efivars` step before chroot is correct and is the canonical fix for "EFI variables not supported" errors during `grub-install`.
- The fstab line uses `umask=0077` (correct for ESP security) and `vfat` filesystem type (correct).
- Tone, structure, and code formatting were preserved; only the single factual correction noted above was made.
