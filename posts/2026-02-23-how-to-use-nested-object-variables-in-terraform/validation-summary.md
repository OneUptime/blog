# Validation Summary: How to Use Nested Object Variables in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform input variables and type constraints
- Terraform object, list, and map types
- Terraform for expressions, locals, variable validation, and `jsonencode`
- HashiCorp AWS provider resources: `aws_vpc`, `aws_db_instance`, `aws_elasticache_cluster`, `aws_ecs_task_definition`

## Sources Consulted
- Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform references documentation: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform `merge` function documentation: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform custom variable validation documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform AWS provider `aws_vpc` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_elasticache_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- Terraform AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition

## Issues Found
- The `aws_elasticache_cluster` example configured Redis with `num_cache_nodes = 3`. The AWS provider documentation states that Redis cache clusters must use `num_cache_nodes = 1`; multi-node Redis topologies require different ElastiCache resources such as replication groups. Changed the example value to `1`.
- The `aws_db_instance` examples omitted required master-user password handling and a username. The AWS provider requires a master password unless a managed password, snapshot, replica, or write-only password argument is used, and `username` is required for normal instance creation. Added `username` to the application object and value example, and added `manage_master_user_password = true` plus `username` to the RDS resource examples.

## Review Notes
The Terraform language examples for nested object type constraints, nested attribute access, `list(object(...))`, `map(object(...))`, `for_each`, for expressions, `merge([... ]...)`, variable validation, locals, and `jsonencode` are technically correct. The AWS snippets remain illustrative and omit surrounding infrastructure such as providers, subnets, IAM roles, and ECS execution roles.
