# Validation Summary: How to Handle ECS Task Definition Revisions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- Terraform AWS provider (hashicorp/aws)
- AWS ECS (task definitions, services, Fargate)
- AWS IAM (task execution roles)
- AWS CloudWatch Logs
- AWS CLI (`aws ecs list-task-definitions`, `aws ecs deregister-task-definition`)

## Sources Consulted
- Terraform AWS provider `aws_ecs_service` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_service.html.markdown
- Terraform AWS provider `aws_ecs_task_definition` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_task_definition.html.markdown
- Terraform AWS provider `aws_ecs_task_definition` data source docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/ecs_task_definition.html.markdown
- AWS ECS API reference (task definition revisions, deregister behavior)
- AWS CLI v2 reference for `aws ecs` subcommands

## Issues Found
- **Invalid `deployment_configuration` block syntax (3 occurrences).** The post used a nested block of the form `deployment_configuration { minimum_healthy_percent = 50; maximum_percent = 200 }` inside `aws_ecs_service`. The `aws_ecs_service` resource does have a `deployment_configuration` block, but it does **not** accept `minimum_healthy_percent` or `maximum_percent`; that block is for the newer ECS deployment strategies (`ROLLING`, `BLUE_GREEN`, `LINEAR`, `CANARY`) and accepts `strategy`, `bake_time_in_minutes`, `canary_configuration`, `linear_configuration`, `lifecycle_hook`. The healthy/maximum percent values must be set as the top-level attributes `deployment_minimum_healthy_percent` and `deployment_maximum_percent`. Applying the original code would fail with an "Unsupported argument" error. I replaced all three blocks with the correct top-level attributes and also updated the matching prose line in the Best Practices section.

## Review Notes
- The `aws_ecs_task_definition.app.arn` attribute correctly includes the revision number, so referencing it pins the service to the Terraform-managed revision — Strategy 1's comment is accurate.
- The `data "aws_ecs_task_definition"` data source with `family` and `revision` attributes used in Strategy 3 is valid.
- The `deployment_circuit_breaker` block with `enable` and `rollback` is correctly used.
- The `aws ecs list-task-definitions` and `aws ecs deregister-task-definition` CLI commands and flags in the cleanup snippet are correct.
- The cleanup script uses a `null_resource` triggered on the task definition ARN; this runs only when the ARN changes, not on a true periodic schedule — the comment "Run this periodically" is a bit misleading but not technically incorrect.
- Inactive (deregistered) task definitions persist permanently per AWS (they remain visible with `--status INACTIVE`), but the post only claims revisions "do not incur charges" and discusses cleanup for organization, which is accurate.
