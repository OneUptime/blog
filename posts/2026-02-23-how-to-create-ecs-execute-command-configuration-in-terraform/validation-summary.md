# Validation Summary: How to Create ECS Execute Command Configuration in Terraform

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Terraform (AWS provider, HCL syntax)
- AWS ECS (Cluster, Service, Task Definition, Fargate launch type)
- AWS ECS Exec (`enable_execute_command`, `execute_command_configuration`)
- AWS Systems Manager (SSM) Session Manager / `ssmmessages` API
- AWS IAM (task role, task execution role, user policies, `AmazonECSTaskExecutionRolePolicy`)
- AWS KMS (encryption of exec sessions)
- AWS CloudWatch Logs (log groups, retention)
- AWS S3 (bucket, SSE-KMS, lifecycle to GLACIER)
- AWS VPC Endpoints (Interface endpoints for `ssm` and `ssmmessages`)
- AWS CLI v2 + Session Manager Plugin (`aws ecs execute-command`)

## Sources Consulted
- AWS ECS Developer Guide — Using Amazon ECS Exec for debugging: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html
- AWS ECS Developer Guide — Required IAM permissions for ECS Exec (task role + caller): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html#ecs-exec-required-iam-permissions
- AWS ECS Developer Guide — Logging ECS Exec sessions: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html#ecs-exec-logging
- AWS ECS Developer Guide — VPC endpoints for ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/vpc-endpoints.html
- AWS CLI v2 Reference — `aws ecs execute-command`: https://docs.aws.amazon.com/cli/latest/reference/ecs/execute-command.html
- AWS ECS API Reference — `ExecuteCommand` action (`Interactive` parameter must be `true`): https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ExecuteCommand.html
- Terraform AWS Provider — `aws_ecs_cluster` `configuration.execute_command_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- Terraform AWS Provider — `aws_ecs_service` `enable_execute_command`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS Provider — `aws_vpc_endpoint`, `aws_kms_key`, `aws_s3_bucket_lifecycle_configuration`

## Issues Found

1. **Second `aws ecs execute-command` example was missing `--interactive` (would fail at the API).**
   - The AWS ECS `ExecuteCommand` API requires the `Interactive` parameter, and per the API reference "The interactive value of true is the only supported value at this time." The original `cat /etc/hostname` example omitted the flag entirely, so the call would be rejected.
   - Fix: added `--interactive` to the single-command example and a short comment explaining why it is mandatory today.

2. **User IAM policy included an invalid `ssm:StartSession` statement.**
   - The original policy granted `ssm:StartSession` on `arn:aws:ecs:us-east-1:*:task/<cluster>/*`. That resource ARN is an ECS resource and is not a valid resource for the `ssm:StartSession` action (SSM session permissions are scoped to SSM documents / instances). More importantly, the calling principal does not need `ssm:StartSession` at all for `aws ecs execute-command` — per current AWS docs the only required action is `ecs:ExecuteCommand` (plus `ecs:DescribeTasks` to enumerate tasks); ECS opens the SSM session on the caller's behalf via the task role's `ssmmessages:*` permissions.
   - Fix: removed the misleading `ssm:StartSession` statement and added a short comment clarifying that ECS starts the SSM session for the caller.

## Review Notes
- The `ssm` interface VPC endpoint shown alongside `ssmmessages` is not strictly required for ECS Exec itself (only `ssmmessages` is mandatory for the session channels), but including it is harmless and is commonly useful when running SSM Agent inside the container for other reasons. Left as written.
- The post's high-level statement that "the ECS agent installs the SSM agent inside each container" is a simplification — on Fargate the SSM Agent binaries are bind-mounted into the task by the Fargate runtime, not installed by the per-container ECS agent — but the simplification is accurate enough for the tutorial's audience and was left unchanged.
- The KMS key created for exec session encryption relies on the default AWS-managed key policy (which permits IAM-based access in the same account). If readers replace this with a custom key policy that does not grant access to the task role / IAM principals, the `kms:Decrypt` task-role permission will be insufficient on its own — worth noting for production hardening.
- When the exec-logs S3 bucket uses SSE-KMS (as shown), uploads from the task will also need `kms:GenerateDataKey` on the same key in addition to the `s3:PutObject` permission already listed. Working as a tutorial baseline, but readers enabling S3 logging in production should add that permission.
- `aws_s3_bucket_lifecycle_configuration` rules without an explicit `filter {}` block emit a warning under recent versions of the AWS provider (v4.x+). Not a hard error, but readers using newer provider versions may want to add `filter {}` to silence it.
- The `--non-interactive` form does exist in the AWS CLI, but the underlying API currently rejects it; only `--interactive` should be used until AWS adds non-interactive support.
