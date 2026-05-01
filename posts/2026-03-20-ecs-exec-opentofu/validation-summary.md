# Validation Summary: How to Set Up ECS Exec for Container Debugging with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS ECS
- ECS Exec
- AWS Systems Manager Session Manager
- AWS IAM
- Amazon CloudWatch Logs
- Amazon S3
- AWS KMS
- AWS CLI

## Sources Consulted
- Amazon ECS Developer Guide: ECS Exec overview: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html
- Amazon ECS Developer Guide: Running commands using ECS Exec: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec-run.html
- Amazon ECS API Reference: ExecuteCommand: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ExecuteCommand.html
- AWS CLI Command Reference: `ecs execute-command`: https://docs.aws.amazon.com/cli/latest/reference/ecs/execute-command.html
- AWS Service Authorization Reference for Amazon ECS: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerservice.html
- Terraform AWS Provider docs: `aws_ecs_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- Terraform AWS Provider docs: `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS Provider docs: `aws_iam_role_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy

## Issues Found
- The introduction implied CloudWatch and S3 logging was inherent to ECS Exec. Updated it to reflect that command/output logging is available when exec logging is configured.
- The prerequisites incorrectly said the task needed the SSM agent. Updated this to reflect AWS's current architecture: ECS/Fargate starts a managed SSM agent inside the container, and added the documented version prerequisites for EC2/Fargate, AWS CLI, and Session Manager plugin.
- The post omitted the `aws_caller_identity` data source even though the HCL referenced `data.aws_caller_identity.current.account_id`. Added the missing data source.
- The cluster logging example used the wrong Terraform argument name, `s3_encryption_enabled`. Corrected it to `s3_bucket_encryption_enabled`, which matches the AWS provider schema.
- The S3 permissions in the task role policy did not match the current AWS ECS Exec logging requirements. Replaced them with the documented `s3:GetBucketLocation`, `s3:GetEncryptionConfiguration`, and `s3:PutObject` permissions.
- The task role policy incorrectly granted `kms:GenerateDataKey`. AWS documents `kms:Decrypt` for the task role and `kms:GenerateDataKey` for the user or group invoking `ecs:ExecuteCommand`, so the policies were corrected accordingly.
- The container shell example used `/bin/bash`, which is not guaranteed in minimal container images and differs from AWS's documented example. Updated it to `/bin/sh`.
- The developer IAM policy allowed `ssm:StartSession`, but AWS recommends denying direct `ssm:start-session` access to ECS tasks so sessions stay logged through ECS Exec. Replaced that statement with the documented `ecs:DescribeTasks` and `kms:GenerateDataKey` permissions needed for ECS Exec access in this post's KMS-enabled setup.

## Review Notes
- The post is technically sound after the fixes above.
- The example developer policy is focused on `ecs:ExecuteCommand` access. In practice, teams often grant additional read-only ECS permissions separately for task discovery workflows.
