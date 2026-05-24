# Validation Summary: How to Create ECS with EFS Volumes in Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (1.0+)
- AWS Provider for Terraform
- Amazon ECS (Elastic Container Service) with Fargate launch type
- Amazon EFS (Elastic File System)
- EFS Access Points
- AWS KMS (encryption at rest)
- AWS IAM (task roles, file system policies)
- Amazon CloudWatch Logs
- NFS protocol (port 2049)

## Sources Consulted
- Terraform AWS Provider docs: `aws_efs_file_system` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system)
- Terraform AWS Provider docs: `aws_efs_access_point` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_access_point)
- Terraform AWS Provider docs: `aws_efs_mount_target` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_mount_target)
- Terraform AWS Provider docs: `aws_efs_file_system_policy` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system_policy)
- Terraform AWS Provider docs: `aws_ecs_task_definition` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition)
- Terraform AWS Provider docs: `aws_ecs_service` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service)
- AWS ECS Developer Guide: Using Amazon EFS volumes (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html)
- AWS EFS User Guide: IAM authorization for NFS clients (https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)
- AWS EFS User Guide: Lifecycle management (transition_to_ia, transition_to_primary_storage_class values)

## Issues Found
No technical issues found.

All Terraform resource arguments, attribute names, IAM action strings (`elasticfilesystem:ClientMount`, `ClientWrite`, `ClientRootAccess`), and AWS service behaviors described match the official Terraform AWS Provider and AWS documentation. The Fargate platform version 1.4.0+ requirement for EFS support is correctly stated. The lifecycle policy values (`AFTER_30_DAYS`, `AFTER_1_ACCESS`) are valid. The security group reference pattern (efs SG referencing ecs_tasks SG) does not create a dependency cycle. The `aws_efs_file_system.main.dns_name` output attribute is valid.

## Review Notes
- The `transit_encryption_port` values chosen (2049, 2050, 2051) are unusual. Port 2049 is the standard NFS server port that EFS listens on; this argument actually specifies the local source port used by stunnel on the client side. Using 2049 locally is technically valid (the argument accepts 0–65535) but non-conventional — most examples use higher ports like 2999. The argument is also entirely optional and the EFS mount helper will pick a port automatically if omitted. The inline comment "Different port for each volume" implies a requirement that doesn't strictly exist. None of this affects correctness.
- The EFS file system policy uses `Resource = aws_efs_file_system.main.arn` which is valid; some users prefer to omit the Resource block in EFS file system policies (since they are inherently scoped to the file system), but including it is also accepted by AWS.
- The post does not explicitly call out that `transit_encryption = "ENABLED"` combined with `iam = "ENABLED"` requires the EFS mount helper / Fargate platform 1.4.0+; this is implicit but documented in the prose.
- Container insights setting on the cluster uses the legacy `setting` block format, which is still supported. The newer `aws_ecs_cluster.setting` with `containerInsights = enhanced` value is also available but not required.
