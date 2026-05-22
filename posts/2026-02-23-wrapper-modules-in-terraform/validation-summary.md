# Validation Summary: How to Create Wrapper Modules in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform modules
- Terraform AWS provider
- Amazon RDS for PostgreSQL
- terraform-aws-modules/rds/aws
- AWS security groups

## Sources Consulted
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform module development documentation: https://developer.hashicorp.com/terraform/language/modules/develop
- terraform-aws-modules/rds/aws v6.4.0 README and inputs: https://github.com/terraform-aws-modules/terraform-aws-rds/tree/v6.4.0
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_vpc_security_group_ingress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- AWS RDS Performance Insights documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Enabling.html

## Issues Found
- The RDS module example enabled Enhanced Monitoring in staging and production with a non-zero `monitoring_interval` but did not provide a monitoring IAM role. Added `create_monitoring_role` and `monitoring_role_name` so the module creates the required role when monitoring is enabled.
- The security group ingress rule used `aws_security_group_rule`. Updated it to `aws_vpc_security_group_ingress_rule`, which is the current AWS provider best-practice resource for standalone VPC security group rules.
- The wrapper output exposed `module.rds.db_instance_name`, but the example never set `db_name`, so no initial database name would be created. Added a `database_name` wrapper variable and passed it through as `db_name`.
- The example pinned PostgreSQL to the old patch version `16.2`. Changed `engine_version` to `16` so the wrapper remains a PostgreSQL 16 wrapper without unnecessarily pinning an outdated minor release.

## Review Notes
- The `terraform-aws-modules/rds/aws` module version `6.4.0` is valid, but newer module versions exist. The pinned version is acceptable for a tutorial because wrapper modules should be versioned and upgraded deliberately.
- AWS has announced changes around the RDS Performance Insights console experience after June 30, 2026. The current module argument is still valid, but future tutorials may want to discuss CloudWatch Database Insights explicitly.
