# Validation Summary: How to Create RDS MySQL Instances with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- AWS RDS for MySQL
- AWS IAM
- AWS KMS
- AWS VPC subnet groups and security groups

## Sources Consulted
- OpenTofu `init` documentation: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_db_parameter_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- AWS provider `aws_db_option_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_option_group
- Amazon RDS VPC and DB subnet group documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- Amazon RDS for MySQL version management: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html
- Amazon RDS Enhanced Monitoring setup: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- AWS managed policy reference for `AmazonRDSEnhancedMonitoringRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonRDSEnhancedMonitoringRole.html
- Amazon RDS Performance Insights setup: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Enabling.html

## Issues Found
- The post pinned `engine_version = "8.0.35"`, but Amazon RDS no longer lists MySQL 8.0.35 as a supported RDS minor version. I changed this to `engine_version = "8.0"` so the example tracks a supported 8.0 minor release while still matching `auto_minor_version_upgrade = true`.
- The `aws_db_instance` example used `password = var.master_password` even though the post advised using Secrets Manager. I replaced it with `manage_master_user_password = true` so the configuration matches current provider guidance and avoids storing the master password directly in configuration.
- The instance snippet referenced `aws_db_option_group.mysql.name`, but no `aws_db_option_group` resource was defined in the post. I removed that reference because option groups are optional for RDS MySQL and the undefined resource would make the snippet fail as written.
- The instance snippet referenced `aws_iam_role.rds_monitoring.arn`, but the IAM role was never created. I added the required IAM role and AWS-managed policy attachment for Enhanced Monitoring and added an explicit `depends_on` so the DB instance waits for the role policy attachment.

## Review Notes
- Performance Insights is still valid on April 23, 2026, but AWS has announced an end-of-life date of June 30, 2026 for the Performance Insights console experience and flexible retention pricing. This post should be revisited before that date to account for the Database Insights transition.
- The `max_connections = "500"` parameter is syntactically valid, but it is workload-specific rather than universally production-safe for every instance size.
