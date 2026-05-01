# Validation Summary: How to Enable ECS Exec for Container Debugging with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- AWS ECS
- AWS Fargate
- ECS Exec
- AWS Systems Manager Session Manager
- AWS IAM
- Amazon VPC interface endpoints
- Amazon CloudWatch Logs
- AWS CLI

## Sources Consulted
- Amazon ECS Developer Guide: ECS Exec - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html
- Amazon ECS Developer Guide: ECS Exec troubleshooting - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec-troubleshooting.html
- Amazon ECS Developer Guide: task definition parameters for Fargate - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS API Reference: `ExecuteCommand` - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ExecuteCommand.html
- AWS CLI Command Reference: `aws ecs execute-command` - https://docs.aws.amazon.com/cli/latest/reference/ecs/execute-command.html
- AWS Systems Manager User Guide: install the Session Manager plugin - https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html
- Terraform Registry: `aws_ecs_cluster` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- Terraform Registry: `aws_ecs_service` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service

## Issues Found
- The post implied a pseudo-terminal was required for ECS Exec and treated `initProcessEnabled` as mandatory. AWS documents `initProcessEnabled` as an optional recommendation for zombie-process cleanup, so I removed the `pseudoTerminal` requirement and reworded `initProcessEnabled` as recommended.
- The interactive shell example used `/bin/bash` with `nginx:latest`, which is not a safe assumption for that image. I changed it to `/bin/sh`, matching AWS’s own ECS Exec example and improving portability.
- The command examples omitted two local prerequisites for `aws ecs execute-command`: a compatible AWS CLI and the Session Manager plugin. I added that prerequisite note because the command will fail without it.
- The post labeled a one-off command as non-interactive even though AWS’s ECS API and SDK docs still describe ECS Exec sessions as interactive-only. I changed the example and best-practice wording to use a single-command exec without claiming non-interactive behavior.
- The private-subnet networking section overstated the endpoint requirement by adding an `ssm` interface endpoint for ECS Exec itself. AWS’s ECS Exec documentation specifically calls out `ssmmessages`, with `kms` additionally required only when customer-managed KMS encryption is used, so I corrected that section.
- The audit-logging example referenced an S3 bucket resource that was never defined and omitted required task-role permissions for CloudWatch log delivery. I simplified the example to CloudWatch Logs only, added the required CloudWatch Logs IAM actions to the task role, and updated the cluster logging block to reference the created log group directly.
- The audit-logging section also omitted AWS’s documented `script` and `cat` requirement for `OVERRIDE` logging. I added that note.
- The troubleshooting section suggested `initProcessEnabled` as the fix for `Container does not support exec`, which is not what AWS documents. I replaced that advice with checks that align with the official guidance: verify the `ExecuteCommandAgent` status and remember that enabling exec only affects new tasks.
- The conclusion overstated the security model by saying ECS Exec works “without any network exposure.” I corrected that to “without opening inbound ports,” which matches AWS’s description.

## Review Notes
- AWS documentation is slightly inconsistent today on non-interactive execution: the AWS CLI reference shows a `--non-interactive` flag, while the ECS API and SDK references still describe ECS Exec as interactive-only. The post now uses the conservative interactive form so it remains aligned with the broader AWS documentation set.
- The post’s `nginx:latest` example is fine for basic ECS Exec usage, but readers who also enable `OVERRIDE` logging must use an image that includes `script` and `cat` or install those utilities in the image.
