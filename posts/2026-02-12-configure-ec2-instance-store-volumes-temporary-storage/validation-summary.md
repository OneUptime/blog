# Validation Summary: How to Configure EC2 Instance Store Volumes for Temporary Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2 instance store volumes
- Amazon EC2 instance types
- NVMe instance store devices
- Linux filesystems and mount options
- mdadm RAID 0
- Docker data directory storage
- Linux swap files
- fio benchmarking
- AWS CLI / S3 sync

## Sources Consulted
- Amazon EC2 User Guide: Instance store volume limits for EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-store-volumes.html
- Amazon EC2 User Guide: Data persistence for Amazon EC2 instance store volumes - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-store-lifetime.html
- Amazon EC2 User Guide: SSD instance store volumes for EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ssd-instance-store.html
- Amazon EC2 User Guide: Add block device mappings to Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-block-device-mapping.html
- Amazon EC2 Instance Types Guide: Storage optimized instance specifications - https://docs.aws.amazon.com/ec2/latest/instancetypes/so.html
- Amazon EC2 Instance Types Guide: General purpose instance specifications - https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html
- fio documentation - https://fio.readthedocs.io/en/master/fio_doc.html
- e2fsprogs mkfs.ext4 man page - https://manpages.debian.org/bullseye/e2fsprogs/mkfs.ext4.8.en.html
- Linux mount man page - https://man7.org/linux/man-pages/man8/mount.8.html

## Issues Found
- The instance-family table listed D2, D3, and D3en simply as HDD. AWS documents D3 and D3en as NVMe HDD instance store, so the table now says "HDD / NVMe HDD".
- The table called C6id, M6id, and R6id the latest generation and capped this row at 7.6 TB. Current AWS documentation includes C8id, M8id, and R8id families with up to 22.8 TB local NVMe SSD storage, so the row was updated.
- The NVMe device statement tied `/dev/nvme*n1` behavior to Amazon Linux 2 and newer instances. AWS documents this as a property of NVMe instance store on supported instance types with NVMe drivers, so the wording now refers to Nitro-based instances with NVMe instance store.
- The user-data script always appended `/dev/md0` to `/etc/fstab`, even when the instance had a single instance store volume mounted directly. The script now stores the actual mounted device path in `FSTAB_DEVICE` and writes that to `fstab`.
- The user-data script said instance store UUIDs change on reboot. AWS documents that instance store data persists across reboot, and a filesystem UUID does not change unless the filesystem is recreated. The note was replaced with a device-path note aligned with instance-store launch behavior.

## Review Notes
- The examples intentionally format instance store devices, which is appropriate for launch-time setup but destructive if run against a device containing data. This is acceptable in context because the post is about provisioning temporary instance store storage.
- RAID 0 improves aggregate throughput and IOPS but provides no redundancy; that trade-off is consistent with the post's temporary-storage framing.
