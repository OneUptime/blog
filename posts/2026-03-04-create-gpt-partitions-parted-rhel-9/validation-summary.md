# Validation Summary: How to Create GPT Partitions with parted on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GNU parted
- GUID Partition Table (GPT)
- XFS filesystems
- Linux block device tools (`lsblk`, `blkid`, `mount`, `/etc/fstab`)

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing storage devices, "Creating a partition table on a disk with parted" and "Creating a partition with parted": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-partitions_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation: "Disk partitions" and GPT/partition flags: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/disk-partitions_managing-storage-devices
- GNU Parted User Manual, `mkpart`: https://www.gnu.org/software/parted/manual/html_node/mkpart.html
- GNU Parted User Manual, `name`: https://www.gnu.org/software/parted/manual/html_node/name.html
- GNU Parted User Manual, invoking Parted and `--align`: https://www.gnu.org/software/parted/manual/html_node/Invoking-Parted.html
- Local `parted --help` and `parted(8)` output for command syntax, flags, and alignment commands.
- Local `lsblk --help`, `blkid --help`, and `mount --help` output for command syntax.

## Issues Found
- The post described `fdisk` as interactive-only. This is not a reliable distinction, so the wording was changed to focus on `parted` being usable interactively and from one-liner commands.
- The GPT `mkpart` examples used `primary` as if it were a GPT partition type. GNU Parted and Red Hat document that `part-type` applies only to MBR-style partition tables and that GPT requires a partition name. The examples now use `data`, `backups`, and `logs` as GPT partition names.
- The partition size comments said GB while the commands used GiB. The comments now say GiB to match the commands.
- The explanation after the `mkpart` examples said `primary` was accepted for compatibility. This was corrected to explain that GPT has no primary/extended/logical distinction and that the first `mkpart` argument is the partition name.
- The example `parted print` output omitted the `xfs` file system type set by the `mkpart ... xfs ...` examples. The sample output now includes `xfs`.
- The EFI System Partition flag example used `boot`; on GPT, `esp` is the clearer flag for an EFI System Partition. The command now uses `set 1 esp on`.
- The "List supported flags" example used `parted print`, which shows currently set flags rather than supported flags. It now uses `parted /dev/sdb help set`.
- The alignment section claimed that `parted` uses optimal alignment by default. The wording was narrowed to the verified claim that `parted` supports optimal alignment and that it can be checked or selected explicitly.
- The command reference described `mkpart name fs start end` generically. It now says `mkpart name fs-type start end` and identifies it as the GPT form.

## Review Notes
The commands are destructive when run on a real disk. The post already warns readers to use an unused disk or one they are ready to repartition, and notes that creating a GPT label wipes the existing partition table. Red Hat also recommends checking kernel recognition of new partitions after changes, for example with `udevadm settle` or `/proc/partitions`; that would be a useful future enhancement but was not required to correct the existing examples.
