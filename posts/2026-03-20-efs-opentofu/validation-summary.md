# Validation Summary: How to Configure Amazon EFS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Amazon EFS
- AWS IAM
- Amazon ECS
- Amazon EC2
- AWS Backup
- NFS

## Sources Consulted
- AWS Provider `aws_efs_file_system` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system
- AWS Provider `aws_efs_access_point` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_access_point
- AWS Provider `aws_efs_backup_policy` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_backup_policy
- AWS Provider `aws_efs_file_system_policy` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system_policy
- Amazon EFS performance specifications: https://docs.aws.amazon.com/efs/latest/ug/performance.html
- Using IAM to control access to file systems: https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html
- Resource-based policy examples for Amazon EFS: https://docs.aws.amazon.com/efs/latest/ug/security_iam_resource-based-policy-examples.html
- Using access points in IAM policies: https://docs.aws.amazon.com/efs/latest/ug/access-points-iam-policy.html
- Specify an Amazon EFS file system in an Amazon ECS task definition: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html
- Mounting EFS file systems using the EFS mount helper: https://docs.aws.amazon.com/efs/latest/ug/efs-mount-helper.html
- Mounting with IAM authorization: https://docs.aws.amazon.com/efs/latest/ug/mounting-IAM-option.html
- Mounting with EFS access points: https://docs.aws.amazon.com/efs/latest/ug/mounting-access-points.html
- Enabling automatic mounting on existing EC2 Linux instances: https://docs.aws.amazon.com/efs/latest/ug/mount-fs-auto-mount-update-fstab.html
- Managing storage lifecycle: https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html
- Backing up EFS file systems: https://docs.aws.amazon.com/efs/latest/ug/awsbackup.html
- Amazon EFS Pricing: https://aws.amazon.com/efs/pricing/

## Issues Found
- The `performance_mode` comment said `maxIO` was for `>7000 IOPS`. That is misleading against current AWS guidance: General Purpose can exceed that depending on throughput mode, and AWS now describes Max I/O as a previous-generation mode for highly parallelized workloads that tolerate higher latency. I updated the comment to match the current EFS performance documentation.
- The conclusion claimed EFS-IA provides a fixed `75% cost reduction`. Current AWS pricing documentation does not present EFS-IA that way and instead describes it as a cost-optimized storage class. I changed the sentence to say `cost-optimized EFS-IA` and kept the `AFTER_1_ACCESS` restore behavior.

## Review Notes
- The `throughput_mode = "bursting"` example is still valid in the AWS provider, but AWS currently recommends Elastic throughput for most workloads.
- The EC2 `/etc/fstab` example is workable as written. AWS's current auto-mount guide also shows `noresvport` as a recommended option for improved recovery behavior after network interruptions.
