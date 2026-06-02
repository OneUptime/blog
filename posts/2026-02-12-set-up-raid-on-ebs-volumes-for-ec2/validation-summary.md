# Validation Summary: How to Set Up RAID on EBS Volumes for EC2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2
- Amazon EBS
- AWS CLI
- Linux software RAID
- mdadm
- ext4
- Linux initramfs and fstab

## Sources Consulted
- Amazon EBS and RAID configuration: https://docs.aws.amazon.com/ebs/latest/userguide/raid-config.html
- Amazon EBS volume types: https://aws.amazon.com/ebs/volume-types/
- AWS CLI create-volume command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-volume.html
- AWS CLI attach-volume command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/attach-volume.html
- Map Amazon EBS volumes to NVMe device names: https://docs.aws.amazon.com/ebs/latest/userguide/identify-nvme-ebs-device.html
- Amazon EBS volume performance: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-performance.html
- Amazon Linux 2 I/O scheduler documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/io-scheduler.html
- mke2fs/ext4 extended options manual page: https://man.he.net/man8/mke2fs
- mdadm manual page for monitor options: https://man.archlinux.org/man/mdadm.8.en

## Issues Found
- The post said a single gp3 volume tops out at 16,000 IOPS. Current AWS documentation lists gp3 support up to 80,000 IOPS and 2,000 MB/s, so the RAID 0 explanation was updated to avoid the outdated limit.
- The RAID 0 risk wording said the risk is minimal because EBS volumes are redundant within an Availability Zone. AWS documents that RAID 0 loses the whole array if any member volume is lost, so the wording now keeps the EBS redundancy context while noting the larger multi-volume failure surface.
- The RAID 1 description said it provides no performance boost. AWS specifically notes RAID 1 provides no write performance improvement and requires more EC2-to-EBS bandwidth, so the text was narrowed to no write performance boost.
- The Nitro NVMe mapping guidance only mentioned `nvme list`. AWS recommends stable identifiers and documents `lsblk -o +SERIAL`, `ebsnvme-id` for Amazon Linux, and `nvme id-ctrl -V` for other Linux distributions, so the post was updated accordingly.
- The read-ahead example used `blockdev --setra 65536`, which sets a much larger buffer than AWS's documented 1 MiB example. It was changed to `2048`, matching AWS's documented sector-unit calculation for 1 MiB read-ahead.

## Review Notes
- The AWS CLI command shapes for `create-volume` and `attach-volume` are current and valid.
- The `mdadm` create, detail, stop, zero-superblock, and monitor command patterns are valid.
- The ext4 `stride` and `stripe-width` values are consistent with a 512 KiB RAID 0 chunk size and 4 KiB filesystem block size across four data disks.
- The post correctly notes that RAID 5 and RAID 6 are not recommended for EBS.
