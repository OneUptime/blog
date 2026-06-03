# Validation Summary: How to Access FSx Volumes from Multiple Availability Zones

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon FSx for Windows File Server
- Amazon FSx for Lustre
- AWS CLI
- AWS CloudFormation
- Amazon VPC networking and security groups
- Amazon CloudWatch
- AWS Cost Explorer and AWS data transfer pricing

## Sources Consulted
- Amazon FSx for Windows File Server: Availability and durability: Single-AZ and Multi-AZ file systems - https://docs.aws.amazon.com/fsx/latest/WindowsGuide/high-availability-multiAZ.html
- Amazon FSx for Windows File Server: File system access control with Amazon VPC - https://docs.aws.amazon.com/fsx/latest/WindowsGuide/limit-access-security-groups.html
- Amazon FSx for Windows File Server: Monitoring with Amazon CloudWatch - https://docs.aws.amazon.com/fsx/latest/WindowsGuide/monitoring-cloudwatch.html
- Amazon FSx for Lustre: Getting started with Amazon FSx for Lustre - https://docs.aws.amazon.com/fsx/latest/LustreGuide/getting-started.html
- Amazon FSx for Lustre: File system access control with Amazon VPC - https://docs.aws.amazon.com/fsx/latest/LustreGuide/limit-access-security-groups.html
- Amazon FSx for Lustre: Amazon FSx for Lustre metrics and dimensions - https://docs.aws.amazon.com/fsx/latest/LustreGuide/fs-metrics.html
- AWS CLI Command Reference: fsx create-file-system - https://docs.aws.amazon.com/cli/latest/reference/fsx/create-file-system.html
- AWS CloudFormation Template Reference: AWS::FSx::FileSystem - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-fsx-filesystem.html
- Amazon VPC User Guide: VPC basics and subnets - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-subnet-basics.html and https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html
- Amazon FSx for Windows File Server pricing - https://aws.amazon.com/fsx/windows/pricing/
- Amazon FSx for Lustre pricing - https://aws.amazon.com/fsx/lustre/pricing/

## Issues Found
- The security group example only opened SMB and DNS ports even though the post also creates and mounts FSx for Lustre. Added the required Lustre TCP ports 988 and 1018-1023, and noted that production FSx for Windows File Server environments must allow the broader Microsoft AD and SMB port set documented by AWS.
- The FSx for Lustre mount command used `/fsx` as the mount name after creating a `PERSISTENT_2` file system. AWS documents that `/fsx` is only always true for `SCRATCH_1`; persistent deployment types have a returned mount name. Added a `describe-file-systems` command to retrieve `LustreConfiguration.MountName` and changed the mount command to use `/mountname`.
- The Lustre mount command omitted the currently documented `relatime,flock` options from the AWS getting started guide. Added those mount options.
- The CloudWatch alarm used `DataReadOperationLatency`, which is not an Amazon FSx CloudWatch metric in the official Windows or Lustre metrics documentation. Replaced it with a valid `NetworkThroughputUtilization` alarm and clarified that end-to-end latency needs client-side or application telemetry.
- The cost section stated a blanket current cross-AZ transfer price of about `$0.01/GB` in each direction. Updated the text to reflect that charges vary by FSx type, deployment type, creation date, and Region, and that newer Multi-AZ FSx for Windows File Server systems do not charge for access from a non-preferred AZ.

## Review Notes
The AWS CLI binary was not installed in the local workspace, so command syntax was verified against the official AWS CLI command reference instead of local `aws --help` output.
