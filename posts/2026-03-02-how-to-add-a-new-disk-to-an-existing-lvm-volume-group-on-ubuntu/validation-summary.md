# Validation Summary: How to Add a New Disk to an Existing LVM Volume Group on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Linux LVM2
- Physical Volumes, Volume Groups, and Logical Volumes
- XFS filesystem resizing
- AWS EBS
- Google Cloud Persistent Disk

## Sources Consulted
- Ubuntu manpage for pvcreate: https://manpages.ubuntu.com/manpages/noble/man8/pvcreate.8.html
- Ubuntu manpage for vgextend: https://manpages.ubuntu.com/manpages/noble/man8/vgextend.8.html
- Ubuntu manpage for lvextend: https://manpages.ubuntu.com/manpages/noble/man8/lvextend.8.html
- Ubuntu manpage for vgck: https://manpages.ubuntu.com/manpages/noble/man8/vgck.8.html
- Ubuntu manpage for xfs_growfs: https://manpages.ubuntu.com/manpages/noble/man8/xfs_growfs.8.html
- Ubuntu manpage for fdisk: https://manpages.ubuntu.com/manpages/noble/man8/fdisk.8.html
- AWS documentation for EBS NVMe device names: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- Google Cloud documentation for persistent device names on Linux VMs: https://cloud.google.com/compute/docs/disks/set-persistent-device-name-in-linux-vm

## Issues Found
- The `fdisk` GPT partition type instruction used `31` for Linux LVM. On current Ubuntu/util-linux GPT type lists, numeric codes are not stable across versions and `31` is not Linux LVM. I changed the instruction to list partition types and choose Linux LVM, or use the `lvm` alias where supported.
- The Google Cloud rescan example used `sudo echo "- - -" > /sys/class/scsi_host/host0/scan`, which does not elevate the shell redirection. I changed it to pipe through `sudo tee`.
- The Google Cloud Persistent Disk note said devices typically show as `/dev/sdb` or `/dev/sdc`. Current Google Cloud documentation distinguishes SCSI (`sd*`) and NVMe (`nvme*`) device names and recommends stable `/dev/disk/by-id/google-*` names, so I updated the note.

## Review Notes
The LVM command syntax for `pvcreate`, `vgextend`, `lvextend -r`, `vgck --updatemetadata`, `pvmove`, and `vgreduce` matches current Ubuntu LVM2 documentation. The XFS resize example correctly uses a mounted filesystem path with `xfs_growfs`.
