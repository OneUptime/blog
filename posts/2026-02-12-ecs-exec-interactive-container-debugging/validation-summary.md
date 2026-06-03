# Validation Summary: How to Set Up ECS Exec for Interactive Container Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- ECS Exec
- AWS Systems Manager Session Manager
- AWS CLI
- IAM policies
- CloudWatch Logs
- Amazon S3
- AWS KMS
- Terraform AWS provider
- Docker

## Sources Consulted
- Amazon ECS Developer Guide: Monitor Amazon ECS containers with ECS Exec, https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html
- Amazon ECS Developer Guide: Running commands using ECS Exec, https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec-run.html
- Amazon ECS Developer Guide: Amazon ECS task IAM role / ECS Exec permissions, https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
- AWS Systems Manager User Guide: Install the Session Manager plugin on macOS, https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-macos-overview.html
- AWS Systems Manager User Guide: Install the Session Manager plugin on Linux, https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-linux-overview.html
- AWS CLI Command Reference: ecs execute-command, https://docs.aws.amazon.com/cli/latest/reference/ecs/execute-command.html
- Terraform Registry: aws_ecs_cluster, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- Terraform Registry: aws_ecs_service, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service

## Issues Found
- The prerequisite incorrectly stated that AWS CLI v1 does not support ECS Exec. Updated it to the current AWS-documented requirement: AWS CLI v2.3.6 or later, or AWS CLI v1.22.3 or later.
- The macOS Session Manager plugin command was labeled generically as macOS installation while using the x86_64 download path. Clarified the label as macOS x86_64 installation.
- The CloudWatch logging IAM example was missing `logs:DescribeLogStreams` and scoped `logs:DescribeLogGroups` to a log group ARN instead of `*`. Updated the policy to match AWS documentation.
- The S3 logging IAM example used the object ARN for `s3:GetEncryptionConfiguration` and omitted `s3:GetBucketLocation`. Updated the S3 permissions and resource scopes to match AWS documentation.
- The post described "non-interactive commands" even though Amazon ECS documents that ECS Exec initiates interactive sessions. Reworded this to "one-off commands through an interactive ECS Exec session."
- The KMS example configured `kms_key_id` but did not mention the required `kms:Decrypt` permission for the task role and `kms:GenerateDataKey` permission for the caller. Added a short note.
- The post described ECS Exec as injecting an SSM agent sidecar. Updated this to say the SSM agent is started inside the container, matching the AWS architecture description.
- The user access-control IAM example only scoped the task resource and omitted the cluster resource and `ecs:DescribeTasks`. Updated it to include both task and cluster ARNs and the documented companion permission.

## Review Notes
The post remains accurate as a practical ECS Exec setup guide after the corrections. Future improvements could mention additional ECS Exec caveats such as writable container filesystems, root execution inside the container, one session per PID namespace, and the requirement for `script` and `cat` in the image when command output logging is enabled.
