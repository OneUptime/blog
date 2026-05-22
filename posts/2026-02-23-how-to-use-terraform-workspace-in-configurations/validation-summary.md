# Validation Summary: How to Use terraform.workspace in Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform CLI workspaces
- Terraform S3 backend
- HashiCorp AWS provider resources and data sources
- HCL

## Sources Consulted
- Terraform references to named values: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform workspaces state documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform backend block overview: https://developer.hashicorp.com/terraform/language/backend
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_wafv2_web_acl` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform AWS provider `aws_subnets` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The environment configuration map did not define `vpc_cidr`, but the later module example used `local.config.vpc_cidr`. Added `vpc_cidr` values for `dev`, `staging`, and `prod` so the example is internally consistent.
- The `aws_db_instance` examples omitted required creation inputs for a new RDS instance. Added `allocated_storage`, `username`, and `manage_master_user_password` to match current AWS provider requirements without hardcoding a plaintext password.
- The database module example accepted `instance_class`, `multi_az`, and `backup_retention` from the module call but only declared `environment` inside the module. Added the missing variable declarations and used `backup_retention_period` in the RDS resource.
- The S3 backend section implied all workspaces are automatically prefixed. Clarified that the automatic `workspace_key_prefix` path applies to non-default workspaces, while the `default` workspace stores state at the configured `key`.

## Review Notes
The examples are tutorial snippets and still assume surrounding resources such as VPCs, launch templates, AMIs, and subnet data sources exist where referenced. Terraform CLI was not installed locally, so validation was performed by source review against official documentation rather than by running `terraform validate`.
