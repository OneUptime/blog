# Validation Summary: How to Use RHEL with AWS EFS for Shared Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Amazon Elastic File System
- AWS CLI
- amazon-efs-utils
- NFS / NFSv4
- Linux mount and fstab configuration

## Sources Consulted
- AWS CLI Command Reference: create-file-system - https://docs.aws.amazon.com/cli/latest/reference/efs/create-file-system.html
- AWS CLI Command Reference: create-mount-target - https://docs.aws.amazon.com/cli/latest/reference/efs/create-mount-target.html
- AWS CLI Command Reference: create-access-point - https://docs.aws.amazon.com/cli/latest/reference/efs/create-access-point.html
- Amazon EFS User Guide: Installing the Amazon EFS client - https://docs.aws.amazon.com/efs/latest/ug/using-amazon-efs-utils.html
- Amazon EFS User Guide: Manually installing the Amazon EFS client - https://docs.aws.amazon.com/efs/latest/ug/installing-amazon-efs-utils.html
- Amazon EFS User Guide: Mounting EFS file systems using the EFS mount helper - https://docs.aws.amazon.com/efs/latest/ug/efs-mount-helper.html
- Amazon EFS User Guide: Mounting with EFS access points - https://docs.aws.amazon.com/efs/latest/ug/mounting-access-points.html
- Amazon EFS User Guide: Amazon EFS performance tips - https://docs.aws.amazon.com/efs/latest/ug/performance-tips.html
- AWS efs-utils README and INSTALL.md - https://github.com/aws/efs-utils

## Issues Found
- The original file system creation example created mount targets immediately after `create-file-system`. AWS documents that `CreateFileSystem` returns while the lifecycle state is still `creating`, and `create-mount-target` requires the file system lifecycle state to be `available`. Added a `describe-file-systems` wait loop before creating mount targets.
- The original mount target example did not wait for mount targets to become available before later mount steps. AWS documents that `create-mount-target` returns while the mount target state is still `creating`. Added a `describe-mount-targets` wait loop.
- The original RHEL installation command used `sudo dnf install -y amazon-efs-utils nfs-utils`, which assumes `amazon-efs-utils` is available from configured RHEL repositories. AWS documents RHEL as supported, but current official installation paths are the pre-built efs-utils installer, Systems Manager Distributor, or building the RPM from source. Replaced the command with the official pre-built installer and kept `nfs-utils` installation.
- The original access point example mounted immediately after `create-access-point`. The efs-utils documentation states that the access point must be in the `available` state before it can be used for mounts. Added a `describe-access-points` wait loop.

## Review Notes
The remaining AWS CLI options, EFS mount helper syntax, access point `PosixUser` and `RootDirectory` shorthand, TLS mount option, `_netdev` fstab option, and `read_ahead_kb` guidance match current AWS documentation. The examples still use placeholder subnet and security group IDs, which readers must replace with resources from their own VPC.
