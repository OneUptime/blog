# Validation Summary: How to Use Variables of Type Object in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform input variables
- Terraform object, map, and list type constraints
- Terraform variable validation
- AWS provider resources for RDS, ECS, and security groups

## Sources Consulted
- Terraform type constraints: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform input variables and assignment methods: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform CLI environment variables: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform `plan` command and `-var` option: https://developer.hashicorp.com/terraform/cli/commands/plan
- AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS provider `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The post said optional attributes were covered later in the post, but the post only links to a separate optional-attributes article. I changed the introduction and default-value note so they no longer imply this post contains an optional-attributes section.

## Review Notes
- Terraform was not installed in the local environment, so syntax and behavior were verified against official Terraform documentation and current AWS provider documentation.
- The inline `ingress` block on `aws_security_group` remains supported, but current AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for new production configurations.
