# Validation Summary: How to Read YAML Configuration Files with yamldecode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- YAML
- Terraform `file`, `yamldecode`, `merge`, `try`, `can`, and `trimsuffix` functions
- AWS provider resources for EC2, VPC, RDS, and ECS/Fargate

## Sources Consulted
- Terraform `yamldecode` function documentation: https://developer.hashicorp.com/terraform/language/functions/yamldecode
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform custom validation documentation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_ecs_task_definition` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS provider `aws_ecs_service` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html

## Issues Found
- The RDS example omitted master user credential handling. Updated the YAML to include a `username` field and the Terraform example to set `username` plus `manage_master_user_password = true`, which lets RDS manage the password in AWS Secrets Manager.
- The ECS/Fargate service catalog included `notification-service` with `cpu: 128` and `memory: 256`, which is not a valid Fargate task size. Updated it to `cpu: 256` and `memory: 512`, a valid Fargate combination.
- The ECS task definition used the same YAML CPU and memory values for both task-level and container-level settings. Removed the container-level `cpu` and `memory` assignments so the example relies on valid task-level Fargate sizing.
- The ECS task definition explicitly set `hostPort` even though the task uses `awsvpc` networking. Removed `hostPort` and kept `containerPort`, which is the current recommended pattern for this network mode.

## Review Notes
- Terraform CLI validation could not be run locally because `terraform` is not installed in the review environment.
- `yamldecode` supports a subset of YAML 1.2 rather than every YAML feature. The post's examples stay within the supported subset.
- The `merge()` example is a shallow merge, which is correct for the flat YAML examples shown. Nested environment overrides would require a deeper merge pattern.
