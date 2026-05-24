# Validation Summary: How to Create ECS with Service Discovery in Terraform

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- AWS ECS (Elastic Container Service)
- AWS Fargate
- AWS Cloud Map (Service Discovery)
- AWS IAM
- AWS VPC and Security Groups
- AWS CloudWatch Logs
- DNS (A records and SRV records)

## Sources Consulted
- HashiCorp Terraform AWS Provider documentation:
  - `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
  - `aws_ecs_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
  - `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
  - `aws_service_discovery_private_dns_namespace`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_private_dns_namespace
  - `aws_service_discovery_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/service_discovery_service
  - `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_security_group`, `aws_cloudwatch_log_group`
- AWS documentation on ECS service discovery and Cloud Map DNS record types
- AWS ECS task definition parameters reference (network modes, FARGATE requirements)

## Issues Found
1. **Invalid `deployment_configuration` block on `aws_ecs_service`** — The original post wrapped `minimum_healthy_percent` and `maximum_percent` inside a `deployment_configuration { ... }` block on the API ECS service. This block does not exist in the Terraform AWS provider for the percentage arguments; they are top-level arguments named `deployment_minimum_healthy_percent` and `deployment_maximum_percent`. (A separate `deployment_configuration` block exists in newer provider versions for BLUE_GREEN/LINEAR/CANARY strategies, but it does not accept those percentage arguments.) Fixed by replacing the block with the correct top-level arguments.

## Review Notes
- The `health_check_custom_config.failure_threshold` argument is technically deprecated by AWS (the value is effectively ignored and treated as 1), but it remains valid Terraform syntax and is harmless to include. No change made.
- The example correctly uses `awsvpc` network mode (required for A record-based service discovery with Fargate) and assigns container_name/container_port only for the SRV-records example (where they are required).
- The `aws_subnets` data source usage is current (replaces the deprecated `aws_subnet_ids` data source).
- `containerInsights = "enabled"` is valid; AWS also now supports `"enhanced"` if users want Container Insights with enhanced observability.
- The Fargate task `cpu`/`memory` combinations used (512/1024 and 256/512) are valid Fargate values.
- Inter-service DNS names like `api.production.local` resolve correctly via Route 53 within the VPC because the private DNS namespace is associated with that VPC.
