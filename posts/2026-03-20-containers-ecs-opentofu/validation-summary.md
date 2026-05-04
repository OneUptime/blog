# Validation Summary: How to Deploy Containers on ECS with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Terraform AWS Provider (`hashicorp/aws`)
- Amazon ECS (Elastic Container Service)
- AWS Fargate / Fargate Spot capacity providers
- AWS Application Auto Scaling
- AWS IAM (execution role and task role)
- AWS Application Load Balancer (target group integration)
- AWS Secrets Manager (referenced via `secrets`)
- Amazon CloudWatch Logs (`awslogs` log driver)
- Amazon ECR (referenced via `aws_ecr_repository`)

## Sources Consulted
- Terraform AWS provider source (`internal/service/ecs/service.go`) for `aws_ecs_service` schema: https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/ecs/service.go
- Terraform Registry docs for `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform Registry docs for `aws_ecs_cluster` and `aws_ecs_cluster_capacity_providers`
- Terraform Registry docs for `aws_ecs_task_definition`
- Terraform Registry docs for `aws_appautoscaling_target` and `aws_appautoscaling_policy`
- AWS Application Auto Scaling predefined metrics (`ECSServiceAverageCPUUtilization`, `ECSServiceAverageMemoryUtilization`)
- AWS ECS task definition / container definitions reference (portMappings, logConfiguration, healthCheck, secrets)

## Issues Found
1. **`deployment_configuration` block misuse in `aws_ecs_service`** — The post used a `deployment_configuration { minimum_healthy_percent = 50, maximum_percent = 200 }` block. In the AWS Terraform provider, `deployment_configuration` is a real but separate block whose fields are `bake_time_in_minutes`, `linear_configuration`, `canary_configuration`, and `lifecycle_hook` — it does **not** contain `minimum_healthy_percent` or `maximum_percent`. The minimum/maximum percent values are top-level arguments named `deployment_minimum_healthy_percent` and `deployment_maximum_percent`. Replaced the block with the correct top-level attributes so the example actually plans/applies.

## Review Notes
- `aws_ecs_cluster_capacity_providers` with `default_capacity_provider_strategy` is the modern correct approach (the older `capacity_providers` argument on `aws_ecs_cluster` itself is deprecated).
- The Fargate task `cpu = 512` / `memory = 1024` combo is a valid Fargate CPU/memory pairing.
- `awsvpc` is the only valid `network_mode` for Fargate; `requires_compatibilities = ["FARGATE"]` is correct.
- `deployment_circuit_breaker { enable, rollback }` matches the provider schema (both fields are required booleans).
- The service uses `capacity_provider_strategy` and omits `launch_type`, which is correct — they are mutually exclusive.
- `lifecycle { ignore_changes = [desired_count] }` is the standard pattern when delegating count to Application Auto Scaling and is correctly noted in the conclusion.
- Predefined autoscaling metric names (`ECSServiceAverageCPUUtilization`, `ECSServiceAverageMemoryUtilization`) match AWS Application Auto Scaling.
- The task role IAM resource is defined but no policy attachments are shown — this is fine for a tutorial focused on the ECS scaffolding (application-specific permissions vary), and the comment makes that intent clear.
- The `awslogs-group` referenced (`aws_cloudwatch_log_group.app`) and ECR repo (`aws_ecr_repository.app`) are not defined in-post but are clearly out-of-scope dependencies.
