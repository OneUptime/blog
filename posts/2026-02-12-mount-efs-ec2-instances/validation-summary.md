# Validation Summary: How to Mount EFS on EC2 Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Elastic File System (EFS)
- Amazon EC2
- amazon-efs-utils / EFS mount helper
- NFSv4
- Linux /etc/fstab
- AWS IAM authorization for EFS
- AWS CloudWatch metrics

## Sources Consulted
- Amazon EFS User Guide: Installing the Amazon EFS client - https://docs.aws.amazon.com/efs/latest/ug/using-amazon-efs-utils.html
- Amazon EFS User Guide: Manually installing the Amazon EFS client - https://docs.aws.amazon.com/efs/latest/ug/installing-amazon-efs-utils.html
- Amazon EFS User Guide: Mounting EFS file systems using the EFS mount helper - https://docs.aws.amazon.com/efs/latest/ug/efs-mount-helper.html
- Amazon EFS User Guide: Mounting on Amazon EC2 with a DNS name - https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-dns-name.html
- Amazon EFS User Guide: Mounting considerations for Linux - https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-general.html
- Amazon EFS User Guide: Enabling automatic mounting on existing EC2 Linux instances - https://docs.aws.amazon.com/efs/latest/ug/mount-fs-auto-mount-update-fstab.html
- Amazon EFS User Guide: Using IAM to control access to file systems - https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html
- Amazon EFS User Guide: Features of Amazon EFS - https://docs.aws.amazon.com/efs/latest/ug/features.html
- Amazon EFS User Guide: Amazon EFS quotas - https://docs.aws.amazon.com/efs/latest/ug/limits.html
- aws/efs-utils INSTALL.md - https://github.com/aws/efs-utils/blob/master/INSTALL.md
- Debian fpsync man page - https://manpages.debian.org/bookworm/fpart/fpsync.1.en.html

## Issues Found
- The post said `amazon-efs-utils` comes pre-installed on Amazon Linux 2 and Amazon Linux 2023. AWS documents it as available from Amazon Linux package repositories, so the wording was corrected.
- The source-build dependency lists for Ubuntu/Debian and RHEL/CentOS were incomplete for current `efs-utils` builds. Added the missing documented build dependencies such as `make`, compiler packages, `cmake`, `wget`, and `perl`.
- The post described NFSv4.1 as required for EFS. EFS supports NFSv4.0 and NFSv4.1, while AWS recommends the shown NFSv4.1 mount option for Linux clients. The wording was corrected.
- The explanations for `retrans=2` and `noresvport` were imprecise. Updated them to match AWS's documented mount option behavior.
- The post said files written on one instance are visible on other instances "within a few seconds." Updated this to describe EFS close-to-open consistency more accurately.

## Review Notes
The examples assume Linux EC2 clients. Amazon EFS does not support mounting from EC2 Windows instances, and EC2 Mac clients use different NFS options. Future revisions could mention `nofail` for cases where an instance should boot even if the EFS mount is unavailable.
