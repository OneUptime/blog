# Validation Summary: How to Align File Systems to Underlying Storage Geometry on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9 storage administration
- GNU parted and fdisk partition alignment
- XFS filesystem creation and geometry reporting
- ext4/mke2fs RAID stride and stripe-width options
- LVM and device-mapper striping
- Linux block device topology and discard/TRIM reporting
- sysstat iostat diagnostics

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_storage_devices/index
- Red Hat Enterprise Linux 9 Managing file systems, ext4 creation and striped device guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 Configuring and managing logical volumes, RAID/LVM stripe options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 7 Storage Administration Guide, storage I/O alignment behavior used by parted, fdisk, and mkfs tools: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/iolimpartitionfstools
- GNU Parted User Manual, `--align` and `align-check`: https://www.gnu.org/software/parted/manual/parted.html
- mkfs.xfs(8) manual page, XFS `su`, `sw`, `sunit`, and `swidth` behavior: https://man7.org/linux/man-pages/man8/mkfs.xfs.8.html
- mke2fs(8) manual page, ext4 `stride` and `stripe_width` options: https://man7.org/linux/man-pages/man8/mke2fs.8.html
- Local system man/help output for `parted`, `fdisk`, `lsblk`, `iostat`, and `mkfs.ext4`

## Issues Found
- The introduction claimed a consistent 10-40% performance penalty on every operation. This was too absolute, so it was changed to describe a significant workload-dependent penalty, especially for write-heavy RAID or large-physical-block devices.
- The explanation said one misaligned write becomes two writes at the hardware level. This was simplified too far, so it was changed to mention extra I/O or read-modify-write work at the hardware or RAID layer.
- The XFS sections implied `sunit=0` and `swidth=0` always mean a filesystem is incorrectly aligned. This was narrowed to striped devices, where missing recorded geometry matters.
- The parted example implied percentages alone ensure optimal alignment. The commands now use `parted -a optimal`, and the explanation says percentages with optimal alignment let parted choose aligned topology-based boundaries.
- The ext4 inspection commands only grepped for `stride`, which could miss the stripe-width field. They now grep for both `stride` and `stripe`.
- The SSD section said `lsblk -D` verifies TRIM/discard configuration. It actually reports discard capabilities, so the wording was corrected.
- The LVM section implied `lvcreate -i` and `-I` automatically align the filesystem. It now says to verify filesystem geometry detection or pass matching geometry to `mkfs`.
- The `iostat` diagnostic wording implied high `w/s` directly indicates write amplification from misalignment. It now presents `iostat` as an investigation signal, not proof of misalignment.

## Review Notes
The command examples are generally valid for RHEL-style systems, but exact optimal alignment depends on the block device's exported topology (`alignment_offset`, `minimum_io_size`, and `optimal_io_size`). For hardware RAID that does not expose useful topology, administrators may still need to pass explicit XFS or ext4 geometry at filesystem creation time.
