# Validation Summary: How to Create EFS File Systems with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Elastic File System (EFS)
- Terraform AWS provider
- AWS security groups
- EFS mount targets and access points
- EFS file system policies and IAM client actions
- Amazon ECS Fargate EFS volumes
- AWS Backup
- Amazon CloudWatch alarms and EFS metrics

## Sources Consulted
- Terraform AWS provider `aws_efs_file_system` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system
- Terraform AWS provider `aws_efs_mount_target` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_mount_target
- Terraform AWS provider `aws_efs_access_point` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_access_point
- Terraform AWS provider `aws_efs_file_system_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system_policy
- Terraform AWS provider `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider `aws_backup_plan` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_plan
- Terraform AWS provider `aws_backup_selection` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_selection
- Terraform AWS provider `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Amazon EFS performance specifications: https://docs.aws.amazon.com/efs/latest/ug/performance.html
- Amazon EFS mount targets: https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html
- Amazon EFS access points: https://docs.aws.amazon.com/efs/latest/ug/create-access-point.html
- Amazon EFS lifecycle management: https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html
- Amazon EFS IAM and file system policies: https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html
- Amazon EFS CloudWatch metrics: https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html
- Amazon EFS automatic backups: https://docs.aws.amazon.com/efs/latest/ug/automatic-backups.html
- AWS Backup plans: https://docs.aws.amazon.com/aws-backup/latest/devguide/about-backup-plans.html

## Issues Found
- The post said Elastic throughput "charges per-request." AWS describes Elastic throughput billing as based on the amount of data and metadata read or written, so this was corrected.
- The post said EFS IA costs about 92% less than Standard. AWS currently describes EFS IA storage pricing as up to 94% lower than EFS Standard, so the figure was updated.
- The post said you need one mount target per AZ. AWS allows one mount target per AZ for Regional file systems, but the practical requirement is one in each AZ where workloads need local access. The statement was narrowed accordingly.
- The post mentioned switching to Max I/O without noting that AWS does not support Max I/O with Elastic throughput. A caveat was added to avoid suggesting an invalid combination.

## Review Notes
- Terraform snippets use current AWS provider resource names and argument names for EFS file systems, mount targets, access points, file system policies, ECS EFS volumes, AWS Backup plans/selections, and CloudWatch metric alarms.
- The examples are illustrative and reference supporting resources such as IAM roles, variables, SNS topics, and VPC IDs that are not fully defined in the post.
- Terraform was not installed in the local environment, so validation was performed by reviewing the HCL against official provider documentation rather than running `terraform validate`.
