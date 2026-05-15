# Validation Summary: How to Convert an MBR Partition Table to GPT on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- MBR and GPT partition tables
- GPT fdisk (`gdisk` and `sgdisk`)
- GNU Parted
- util-linux `sfdisk`
- GRUB 2
- UEFI, EFI System Partitions, and BIOS Boot Partitions
- FAT32 ESP formatting with `mkfs.vfat`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Boot options for RHEL Installer, `inst.gpt` and MBR/GPT behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/boot_options_for_rhel_installer/boot-options-for-rhel-installer.pdf
- Red Hat Enterprise Linux documentation: BIOS Boot and EFI System Partition requirements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/installation_guide/sect-disk-partitioning-setup-x86
- Red Hat Enterprise Linux 9 documentation: UEFI Secure Boot and `grub2-install` warning: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/interactively_installing_rhel_from_installation_media/index
- Red Hat Enterprise Linux 9 documentation: RHEL 9 GRUB configuration path behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/considerations_in_adopting_rhel_9
- GPT fdisk official documentation: converting to or from GPT: https://www.rodsbooks.com/gdisk/mbr2gpt.html
- Local GPT fdisk man pages for `gdisk(8)` and `sgdisk(8)`
- GNU Parted manual: `print` command and partition table labels: https://www.gnu.org/software/parted/manual/parted.html
- util-linux `sfdisk(8)` manual for `--dump`/`-d`: https://man7.org/linux/man-pages/man8/sfdisk.8.html
- dosfstools `mkfs.fat(8)` manual for `-F 32`: https://manpages.debian.org/testing/dosfstools/mkfs.fat.8.en.html
- UEFI Specification 2.10, GPT layout and protective MBR: https://uefi.org/specs/UEFI/2.10/05_GUID_Partition_Table_Format.html

## Issues Found
- The MBR disk-size limit was stated as exactly "2 TB". Changed it to "about 2 TiB on disks with 512-byte sectors" to match the sector-count limit described by Red Hat documentation.
- The backup section implied the first 512 bytes plus an `sfdisk` dump were equivalent for all MBR layouts. Added a note that disks with extended/logical partitions need the `sfdisk` dump because the first sector alone does not back up every extended boot record.
- The ESP formatting example used `/dev/sdb1`, which could overwrite an existing partition after conversion. Changed the command to `/dev/sdbX` and added a warning to replace it with the newly created ESP.
- The boot-partition examples did not mention that free space is required. Added a note that partitions may need to be shrunk or moved before creating a BIOS Boot Partition or ESP.
- The MBR restore example only wrote the saved first sector, which can leave stale GPT metadata on disk. Added `sgdisk -z /dev/sdb` before restoring the MBR backup.
- The post-conversion cleanup section recommended `grub2-install /dev/sdb` for any boot disk. Narrowed it to BIOS/legacy boot disks and added the RHEL UEFI Secure Boot caveat from Red Hat documentation.
- The wrap-up described data-disk conversion as "nearly risk-free". Changed it to "usually straightforward" because GPT fdisk documents cases where conversion can fail or bootability can be affected.

## Review Notes
The core `gdisk` and `sgdisk -g` conversion commands are valid. GPT fdisk documents that MBR-to-GPT conversion preserves partition boundaries in the normal case, converts logical partitions to GPT partitions, and may leave partition-number gaps after logical partition conversion. Boot-disk conversion remains environment-specific and should be tested with rescue media available.
