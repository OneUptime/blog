# Validation Summary: How to Create RDS PostgreSQL Instance in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- HashiCorp Random provider
- Amazon RDS for PostgreSQL
- Amazon VPC security groups
- Amazon RDS DB subnet groups and parameter groups
- AWS Secrets Manager
- AWS IAM
- AWS CLI
- PostgreSQL extensions

## Sources Consulted
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_db_parameter_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform Random provider `random_password` resource documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- Amazon RDS DB instance storage documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Amazon RDS parameter values and formula documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ParamValuesRef.html
- Amazon RDS PostgreSQL extension documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Extensions.html
- Amazon RDS `pg_cron` documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL_pg_cron.html
- Amazon RDS password management with Secrets Manager documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- AWS CLI `describe-db-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- PostgreSQL 16 resource consumption configuration documentation: https://www.postgresql.org/docs/16/runtime-config-resource.html
- PostgreSQL `uuid-ossp` documentation: https://www.postgresql.org/docs/current/uuid-ossp.html

## Issues Found
- The RDS instance example set `iops = 3000` and `storage_throughput = 125` with `allocated_storage = 100` and `storage_type = "gp3"`. Terraform's AWS provider documents that explicit gp3 IOPS and throughput cannot be specified below the per-engine storage threshold. I removed those explicit arguments and left gp3 to use the baseline performance at that size.
- The SQL extension example used `CREATE EXTENSION IF NOT EXISTS uuid-ossp;`. PostgreSQL extension names containing hyphens must be quoted as identifiers, so I changed it to `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`.
- The Secrets Manager section said to keep credentials out of Terraform state as much as possible, but the shown `random_password` and `aws_db_instance.password` values are still stored in Terraform state. I updated the wording to state that clearly and recommend protecting Terraform state.

## Review Notes
- The Terraform examples are partial snippets and assume variables such as `var.aws_region`, `var.vpc_id`, `var.private_subnet_ids`, `var.app_security_group_id`, `var.instance_class`, and `var.environment` are defined elsewhere.
- Current Terraform AWS provider documentation recommends standalone VPC security group rule resources over inline security group rules for new configurations, but the inline rule syntax shown is still valid.
- For the strongest state hygiene, future revisions could use RDS-managed master user passwords with Secrets Manager instead of generating the password in Terraform.
