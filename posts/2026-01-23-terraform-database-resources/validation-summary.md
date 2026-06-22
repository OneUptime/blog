# Validation Summary: How to Deploy Database Resources with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon RDS for PostgreSQL
- Amazon Aurora PostgreSQL
- Amazon ElastiCache for Redis OSS
- AWS Secrets Manager
- AWS KMS
- Amazon CloudWatch Logs
- RDS Enhanced Monitoring and Performance Insights

## Sources Consulted
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_db_instance` source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- Terraform AWS provider `aws_rds_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider `aws_rds_cluster` source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster.html.markdown
- Terraform AWS provider `aws_rds_cluster_instance` source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster_instance.html.markdown
- Terraform AWS provider `aws_elasticache_replication_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider `aws_elasticache_replication_group` source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/elasticache_replication_group.html.markdown
- Terraform AWS provider Secrets Manager resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS RDS for PostgreSQL CloudWatch Logs documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Concepts.PostgreSQL.html
- AWS Aurora PostgreSQL CloudWatch Logs documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.CloudWatch.html
- AWS cross-Region RDS read replica documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html
- AWS RDS Performance Insights EOL documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Enabling.html

## Issues Found
- The primary `aws_db_instance` did not set `db_name`, but later outputs and the connection secret used `var.database_name`. Added `db_name = var.database_name` so the PostgreSQL database name is actually created and the output is meaningful.
- The RDS instance used `manage_master_user_password = true`, but the Secrets Manager section generated an unrelated random password and stored it as if it were the database password. Replaced that with an output of `aws_db_instance.main.master_user_secret[0].secret_arn` and a separate connection-details secret that references the RDS-managed secret instead of inventing credentials that the database does not use.
- The lifecycle block ignored changes to `manage_master_user_password` with a comment about password changes in Secrets Manager. That setting would mask changes to the Terraform argument rather than track password rotation, so the misleading `ignore_changes` entry was removed.
- The read replica comment said replicas "get" backups from the primary. Changed the comment to say automated backups are disabled on replicas used only for read scaling.
- The Variables section omitted several variables used by later examples, including read replica, cross-region replica, Aurora, Redis, and SNS inputs. Added the missing variable definitions so the snippets are internally consistent.
- The `secret_arn` output referenced the old custom credential secret. Updated it to reference the connection-details secret and added a separate sensitive output for the RDS-managed master user secret ARN.

## Review Notes
- Terraform was not installed in the review environment, so CLI validation with `terraform fmt` or `terraform validate` was not possible. Review was performed against official Terraform AWS provider documentation and AWS service documentation.
- AWS has announced an end-of-life date of June 30, 2026 for the RDS Performance Insights console experience and flexible retention pricing. The Terraform `performance_insights_*` attributes remain documented, and the examples use seven-day retention, but future updates should consider CloudWatch Database Insights settings where appropriate.
- The cross-region replica snippet assumes an aliased provider named `aws.dr_region` is configured elsewhere. That is a normal Terraform pattern, but a complete runnable module would need to include the aliased provider configuration.
