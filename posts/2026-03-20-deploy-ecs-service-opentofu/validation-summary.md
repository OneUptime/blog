# Validation Summary: How to Deploy an ECS Service with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- HashiCorp Configuration Language (HCL)
- Amazon ECS (Elastic Container Service)
- AWS Fargate launch type
- AWS IAM (roles, policy attachments, assume-role policy documents)
- AWS CloudWatch Logs (`awslogs` log driver)
- AWS Secrets Manager (referenced via task `secrets`)
- AWS Application Load Balancer (target group / listener references)
- terraform-provider-aws (`aws_ecs_cluster`, `aws_ecs_service`, `aws_ecs_task_definition`, `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_cloudwatch_log_group`)

## Sources Consulted
- terraform-provider-aws docs for `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- terraform-provider-aws docs for `aws_ecs_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- terraform-provider-aws docs for `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS ECS Task Execution IAM Role docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS ECS container definition reference (camelCase API field names: `portMappings`, `containerPort`, `logConfiguration`, etc.)

## Issues Found
1. **Incorrect `deployment_configuration` block on `aws_ecs_service`.** The post used:
   ```hcl
   deployment_configuration {
     minimum_healthy_percent = 100
     maximum_percent         = 200
   }
   ```
   This is invalid for the AWS provider's `aws_ecs_service` resource. While a `deployment_configuration` block does exist on this resource, it accepts arguments like `strategy`, `bake_time_in_minutes`, `canary_configuration`, `linear_configuration`, and `lifecycle_hook` — not `minimum_healthy_percent` / `maximum_percent`. The healthy-percent and maximum-percent values are top-level attributes named `deployment_minimum_healthy_percent` and `deployment_maximum_percent`. Fixed by replacing the block with the two top-level attributes.

## Review Notes
- The `setting { name = "containerInsights", value = "enabled" }` block on `aws_ecs_cluster` is valid; note that AWS now also supports `value = "enhanced"` for ECS Container Insights with enhanced observability if the author later wants to recommend it.
- Both the execution role and task role share the same `ecs-tasks.amazonaws.com` assume-role policy, which is correct.
- The `lifecycle { ignore_changes = [task_definition] }` pattern is appropriate when CI/CD updates the task definition revision out-of-band; readers should be aware that this also means OpenTofu will not roll back manual task-definition changes.
- The container definitions JSON correctly uses camelCase field names as expected by the ECS API.
- `desired_count` is not in `ignore_changes`, so OpenTofu will still manage replica counts. If autoscaling via `aws_appautoscaling_target` is later added, `desired_count` should also be added to `ignore_changes`.
