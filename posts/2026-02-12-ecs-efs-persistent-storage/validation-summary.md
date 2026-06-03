# Validation Summary: How to Use ECS with EFS for Persistent Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon EFS
- EFS access points
- IAM authorization and EFS file system policies
- Terraform AWS provider
- ECS task definitions

## Sources Consulted
- Amazon ECS Developer Guide: Use Amazon EFS volumes with Amazon ECS - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html
- Amazon ECS Developer Guide: Specify an Amazon EFS file system in an Amazon ECS task definition - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html
- Amazon EFS User Guide: Managing mount targets - https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html
- Amazon EFS User Guide: Creating mount targets - https://docs.aws.amazon.com/efs/latest/ug/manage-fs-access-create-delete-mount-targets.html
- Amazon EFS User Guide: Working with access points / enforcing root directories - https://docs.aws.amazon.com/efs/latest/ug/efs-access-points.html and https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html
- Amazon EFS User Guide: Using IAM to control access to file systems - https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html
- Amazon EFS User Guide: Performance specifications and throughput modes - https://docs.aws.amazon.com/efs/latest/ug/performance.html
- Terraform AWS provider documentation: aws_efs_file_system, aws_efs_access_point, aws_ecs_task_definition, aws_ecs_service - https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The post said EFS works with Fargate without noting the platform constraint. Updated the statement to specify Fargate tasks on Linux platform version 1.4.0 or later, matching Amazon ECS documentation.
- The task definition JSON used 9-digit placeholder AWS account IDs in the execution role ARN and ECR image URI. Updated both placeholders to the standard 12-digit AWS account ID format.
- The Terraform IAM examples referenced `aws_iam_role.task_role`, while the task definition used `aws_iam_role.task`. Updated the IAM policy and file system policy snippets to use `aws_iam_role.task` consistently.
- The post said an EFS file system policy is required for IAM-based access. AWS documents that an allow in either an IAM identity policy or a file system resource policy can grant access, so the wording was changed to present the file system policy as an optional restriction mechanism.
- The shared ECS service Terraform example omitted required service configuration such as `cluster`, `task_definition`, and networking for Fargate/awsvpc tasks. Added minimal required attributes so the example is structurally valid.
- The performance section omitted Elastic throughput, described Bursting throughput as "Free tier," and treated Max I/O as generally recommended for highly parallel workloads. Updated the section to include Elastic throughput, clarify Bursting throughput, and reflect AWS guidance that General Purpose is recommended and Max I/O is a previous-generation mode with higher latency and no Elastic throughput support.
- The provisioned throughput Terraform example used `MB/s` in a comment for `provisioned_throughput_in_mibps`. Updated the comment to `MiB/s` to match the Terraform provider argument unit.
- The EFS file system Terraform comment listed only bursting and provisioned throughput modes. Updated it to include Elastic throughput while noting that the Terraform AWS provider default is bursting.

## Review Notes
The remaining examples are illustrative and still assume surrounding infrastructure exists, including VPC, private subnets, ECS cluster, task roles, task definitions, CloudWatch log group, and security groups. The EFS access point, ECS EFS volume configuration, IAM action names, mount target guidance, and read-only mount syntax were verified against official AWS and Terraform documentation.
