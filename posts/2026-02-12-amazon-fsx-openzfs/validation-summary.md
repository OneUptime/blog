# Validation Summary: How to Set Up Amazon FSx for OpenZFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon FSx for OpenZFS
- AWS CLI
- NFS
- Amazon VPC security groups
- Amazon CloudWatch
- Terraform AWS provider
- ZFS snapshots, clones, compression, and record size settings

## Sources Consulted
- AWS FSx for OpenZFS User Guide: Creating file systems: https://docs.aws.amazon.com/fsx/latest/OpenZFSGuide/creating-file-systems.html
- AWS FSx API Reference: CreateFileSystemOpenZFSConfiguration: https://docs.aws.amazon.com/fsx/latest/APIReference/API_CreateFileSystemOpenZFSConfiguration.html
- AWS FSx for OpenZFS User Guide: Creating volumes: https://docs.aws.amazon.com/fsx/latest/OpenZFSGuide/creating-volumes.html
- AWS FSx API Reference: CreateOpenZFSVolumeConfiguration: https://docs.aws.amazon.com/fsx/latest/APIReference/API_CreateOpenZFSVolumeConfiguration.html
- AWS FSx for OpenZFS User Guide: Mounting volumes: https://docs.aws.amazon.com/fsx/latest/OpenZFSGuide/mounting-volumes.html
- AWS FSx for OpenZFS User Guide: Snapshots: https://docs.aws.amazon.com/fsx/latest/OpenZFSGuide/snapshots-openzfs.html
- AWS FSx for OpenZFS User Guide: VPC security groups: https://docs.aws.amazon.com/fsx/latest/OpenZFSGuide/limit-access-security-groups.html
- AWS FSx for OpenZFS User Guide: CloudWatch metrics and dimensions: https://docs.aws.amazon.com/fsx/latest/OpenZFSGuide/fsx-openzfs-metrics.html
- Terraform Registry: aws_fsx_openzfs_file_system: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_openzfs_file_system
- Terraform Registry: aws_fsx_openzfs_volume: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_openzfs_volume

## Issues Found
- Updated the FSx for OpenZFS performance claim from "up to 1 million IOPS" to "up to 2 million IOPS" to match current AWS documentation.
- Corrected the throughput capacity list. Valid throughput values now depend on the deployment type, and `SINGLE_AZ_2` / `MULTI_AZ_1` support values up to 10240 MB/s.
- Clarified `DiskIopsConfiguration` because automatic mode is 3 IOPS per GiB, while maximum user-provisioned IOPS depends on deployment type and Region.
- Corrected OpenZFS volume names from hyphenated names (`app-data`, `dev-clone`) to underscore names (`app_data`, `dev_clone`), because FSx for OpenZFS volume names allow alphanumeric characters and underscores only.
- Added `crossmnt` to child-volume NFS export examples and clarified that `.zfs/snapshot` file-level access requires `crossmnt`.
- Corrected the child-volume mount path from `/fsx/app-data` to `/fsx/app_data` to match the corrected volume name.
- Corrected the clone example snapshot ARN to the documented `snapshot/fsvol-.../fsvolsnap-...` format.
- Reworded the clone storage statement to say clones initially consume no additional capacity beyond changes, rather than "zero additional storage."
- Replaced unsupported CloudWatch metric names (`StorageCapacityUtilization`, `ThroughputUtilization`) with documented FSx for OpenZFS metrics (`CompressionRatio`, `UsedStorageCapacity`, and `NetworkThroughputUtilization`).
- Reworded compression performance claims to match AWS documentation and avoid unsupported fixed compression-ratio expectations.
- Replaced malformed placeholder AWS IDs with valid-looking placeholder IDs so the examples match AWS identifier formats.
- Expanded the Terraform security group example to include the documented UDP NFS rules and TCP/UDP 20001-20003 rules, matching the FSx for OpenZFS VPC security group guidance.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against AWS official documentation rather than local `aws help` output. The post still uses placeholder AWS resource IDs; readers must replace them with real IDs from their own account.
