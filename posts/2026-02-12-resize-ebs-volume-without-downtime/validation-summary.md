# Validation Summary: How to Resize an EBS Volume Without Downtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EBS Elastic Volumes
- Amazon EC2
- AWS CLI
- Linux block devices and partitions
- growpart
- XFS
- ext2/ext3/ext4
- Windows PowerShell Storage module
- diskpart

## Sources Consulted
- Amazon EBS User Guide: Modify an Amazon EBS volume using Elastic Volumes operations - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modify-volume.html
- Amazon EBS User Guide: Monitor the progress of Amazon EBS volume modifications - https://docs.aws.amazon.com/ebs/latest/userguide/monitoring-volume-modifications.html
- Amazon EBS User Guide: Extend the file system after resizing an Amazon EBS volume - https://docs.aws.amazon.com/ebs/latest/userguide/recognize-expanded-volume-linux.html
- AWS CLI Command Reference: ec2 modify-volume - https://docs.aws.amazon.com/cli/v1/reference/ec2/modify-volume.html
- Microsoft Learn: Get-PartitionSupportedSize - https://learn.microsoft.com/en-us/powershell/module/storage/get-partitionsupportedsize
- Microsoft Learn: Resize-Partition - https://learn.microsoft.com/en-us/powershell/module/storage/resize-partition
- Ubuntu Manpage: growpart - https://manpages.ubuntu.com/manpages/noble/man1/growpart.1.html
- Linux man-pages: resize2fs(8) - https://man7.org/linux/man-pages/man8/resize2fs.8.html

## Issues Found
- The post said EBS volumes can only be modified once every 6 hours. AWS documentation now states that a volume must reach `completed` before another modification and can be modified up to four times within a rolling 24-hour period, assuming previous modifications are complete. Updated both the introductory restriction and the "Things to Watch Out For" section.
- The introduction said the instance never needs to stop. AWS documents that online modification depends on Elastic Volumes support and that some previous-generation instance cases can require detach/reattach or stop/start. Updated the statement to qualify it with Elastic Volumes support.
- The automation script polled indefinitely unless the modification reached `optimizing` or `completed`. AWS modification states can include `failed`, so the script now exits with an error when that state is returned.

## Review Notes
The AWS CLI examples, `growpart`, `xfs_growfs`, `resize2fs`, PowerShell partition resize commands, and `diskpart extend` flow are consistent with the consulted documentation. The script is intentionally simple and does not cover LVM, encrypted device mapper layouts, or mount points containing whitespace; those are reasonable caveats for future improvement but not defects in the guide's stated examples.
