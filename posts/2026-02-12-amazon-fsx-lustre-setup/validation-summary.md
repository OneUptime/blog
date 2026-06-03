# Validation Summary: How to Set Up Amazon FSx for Lustre

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Amazon FSx for Lustre
- AWS CLI
- Amazon EC2 security groups
- Lustre client packages for Amazon Linux 2 and Ubuntu
- Amazon S3 data repository associations
- Amazon CloudWatch metrics
- Terraform AWS provider

## Sources Consulted
- AWS CLI Command Reference: create-file-system - https://docs.aws.amazon.com/cli/latest/reference/fsx/create-file-system.html
- AWS CLI Command Reference: create-data-repository-association - https://docs.aws.amazon.com/cli/latest/reference/fsx/create-data-repository-association.html
- AWS CLI Command Reference: create-data-repository-task - https://docs.aws.amazon.com/cli/latest/reference/fsx/create-data-repository-task.html
- Amazon FSx for Lustre User Guide: Deployment and storage class options - https://docs.aws.amazon.com/fsx/latest/LustreGuide/using-fsx-lustre.html
- Amazon FSx for Lustre User Guide: Performance characteristics of SSD and HDD storage classes - https://docs.aws.amazon.com/fsx/latest/LustreGuide/ssd-storage.html
- Amazon FSx for Lustre User Guide: File system access control with Amazon VPC - https://docs.aws.amazon.com/fsx/latest/LustreGuide/limit-access-security-groups.html
- Amazon FSx for Lustre User Guide: Installing the Lustre client - https://docs.aws.amazon.com/fsx/latest/LustreGuide/install-lustre-client.html
- Amazon FSx for Lustre User Guide: Mounting from Amazon EC2 - https://docs.aws.amazon.com/fsx/latest/LustreGuide/mounting-ec2-instance.html
- Terraform AWS Provider: aws_fsx_lustre_file_system - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_lustre_file_system

## Issues Found
- Corrected the SCRATCH_2 storage-capacity explanation from "minimum 1200 GB, increments of 2400 GB" to the actual valid SSD values: 1200 GiB, 2400 GiB, and increments of 2400 GiB.
- Added missing Lustre security group ingress rules for TCP 1018-1023 from client instances, TCP 988 self-referencing traffic, and client-side callback/client-to-client traffic for restrictive client security groups, matching AWS's required FSx for Lustre traffic rules.
- Updated the Ubuntu Lustre client repository example to use `$(lsb_release -cs)` instead of hard-coding `focal`, so the command works for supported Ubuntu releases beyond 20.04.
- Corrected the export data repository task path from `/output/` to `output/`, because AWS documents export task paths as relative to the file system mount point.
- Added the same missing TCP 988 self-reference and TCP 1018-1023 client ingress rules to the Terraform security group example.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against current official AWS CLI and Amazon FSx for Lustre documentation instead of local `aws help` output. The post remains a high-level setup guide and does not cover newer FSx for Lustre Intelligent-Tiering or EFA/GDS options, but that omission is acceptable for the scope of this tutorial.
