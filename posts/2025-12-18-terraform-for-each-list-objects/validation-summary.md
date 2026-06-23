# Validation Summary: How to Loop Through list(objects) with for_each in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform `for_each` meta-argument
- Terraform `for` expressions
- Terraform optional object attributes
- AWS provider resources for IAM, VPC subnets, security groups, ECS, EC2, CloudWatch, and RDS

## Sources Consulted
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `for` expressions reference: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform types and automatic conversion: https://developer.hashicorp.com/terraform/language/expressions/types
- AWS provider `aws_ecs_service` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_service.html.markdown
- AWS provider `aws_db_instance` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_ecs_task_definition` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Amazon ECS task definition health check documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html

## Issues Found
- The `aws_db_instance.primary` example omitted arguments required for creating a primary RDS DB instance. Added `allocated_storage`, `username`, and `manage_master_user_password`, and added `backup_retention_period` because an RDS instance must have backup retention greater than zero to act as a read replica source.
- The read replica example included a `region` field in the input object but only used it as a tag. Added the `region` resource argument and changed `replicate_source_db` to use the primary instance ARN, which is required for cross-region RDS replicas.
- The ECS service example set `health_check_grace_period_seconds` while not configuring a load balancer. Removed that argument because the AWS provider documents it as only valid for services configured with load balancers. Moved the health path comment to the ECS task definition health check where the optional field is actually used.

## Review Notes
The Terraform language patterns for converting `list(object(...))` values into maps for `for_each`, filtering with `if`, flattening nested structures, and using optional object attributes are technically correct. Several AWS examples are illustrative snippets and still assume surrounding infrastructure such as VPCs, clusters, task definitions, AMIs, security groups, and provider configuration exist elsewhere.
