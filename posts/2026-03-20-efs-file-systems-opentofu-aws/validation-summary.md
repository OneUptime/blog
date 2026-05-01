# Validation Summary: How to Create and Mount EFS File Systems on AWS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Elastic File System (EFS)
- Amazon EC2
- Amazon ECS Fargate
- AWS Identity and Access Management (IAM)
- AWS Key Management Service (KMS)
- NFS

## Sources Consulted
- AWS EFS mount targets: https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html
- AWS EFS mount target creation details: https://docs.aws.amazon.com/efs/latest/ug/manage-fs-access-create-delete-mount-targets.html
- AWS EFS mount helper: https://docs.aws.amazon.com/efs/latest/ug/efs-mount-helper.html
- AWS EFS access point mounting: https://docs.aws.amazon.com/efs/latest/ug/mounting-access-points.html
- AWS ECS EFS task definition settings: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html
- AWS ECS EFS best practices: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-best-practices.html
- AWS EFS IAM access point policies: https://docs.aws.amazon.com/efs/latest/ug/access-points-iam-policy.html
- AWS EFS resource-based policy examples: https://docs.aws.amazon.com/efs/latest/ug/security_iam_resource-based-policy-examples.html
- AWS EFS CloudWatch metrics: https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html
- Terraform Registry `aws_efs_file_system`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system
- Terraform Registry `aws_efs_mount_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_mount_target
- Terraform Registry `aws_efs_access_point`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_access_point

## Issues Found
- The mount target example iterated over every private subnet, but Amazon EFS allows only one mount target per Availability Zone. I changed the example to use `var.private_subnet_ids` and clarified that readers should provide one subnet ID per AZ.
- The EC2 `/etc/fstab` example omitted the `_netdev` option. I changed the entry to `_netdev,tls` because AWS documents `_netdev` as required for reliable automatic mounting at boot.
- The ECS task definition enabled EFS IAM authorization with `authorization_config.iam = "ENABLED"` but did not set a task IAM role. I added `task_role_arn = aws_iam_role.ecs_task.arn` because ECS uses the task role when mounting EFS with IAM authorization.

## Review Notes
- `throughput_mode = "bursting"` is still valid, but AWS currently recommends Elastic throughput by default for many new EFS file systems. The post remains technically correct as written after the fixes above.
