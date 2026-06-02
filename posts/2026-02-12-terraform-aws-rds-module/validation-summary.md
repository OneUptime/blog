# Validation Summary: How to Use the Terraform AWS RDS Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS RDS
- Terraform
- terraform-aws-modules/rds/aws
- terraform-aws-modules/security-group/aws
- PostgreSQL
- MySQL
- AWS Secrets Manager
- Amazon CloudWatch
- RDS Enhanced Monitoring
- RDS Performance Insights

## Sources Consulted
- Terraform AWS RDS module v6.4.0 README and inputs/outputs: https://github.com/terraform-aws-modules/terraform-aws-rds/tree/v6.4.0
- Terraform AWS RDS module v6.4.0 PostgreSQL read replica example: https://github.com/terraform-aws-modules/terraform-aws-rds/blob/v6.4.0/examples/replica-postgres/main.tf
- Terraform AWS Security Group module v5.1.0 README: https://github.com/terraform-aws-modules/terraform-aws-security-group/tree/v5.1.0
- AWS RDS Secrets Manager integration limitations: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- Amazon RDS for PostgreSQL release notes and supported versions: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon RDS for MySQL supported versions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html
- Amazon RDS DB instance storage and gp3 behavior: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Amazon RDS Performance Insights retention: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.cost.html
- AWS RDS Enhanced Monitoring IAM role guidance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html

## Issues Found
- PostgreSQL examples used `engine_version = "16.2"`, which is no longer a current supported minor version for new RDS PostgreSQL examples. Updated PostgreSQL snippets to `16.13`.
- MySQL example used `engine_version = "8.0.35"`, which is no longer supported for new RDS MySQL examples. Updated it to `8.0.46`.
- The production storage comment described `gp3` as "provisioned IOPS" storage. RDS classifies `gp3` as General Purpose SSD storage with configurable performance, while Provisioned IOPS storage is `io1`/`io2`. Updated the comment.
- The read replica example referenced a source instance that would have used the RDS module default `manage_master_user_password = true`. AWS RDS does not support creating read replicas from a source DB instance that manages credentials in Secrets Manager, except for SQL Server. Added `password = var.production_db_password` and `manage_master_user_password = false` to the production source example.
- The introduction implied the RDS module creates security groups as part of the same module call. The module accepts security group IDs, while the post creates the security group separately with the security-group module. Updated the wording.
- The PostgreSQL basic snippet described `major_engine_version` as being for an option group. The module does not create option groups for PostgreSQL. Updated the comment to clarify this applies only to engines that support option groups.

## Review Notes
Terraform CLI is not installed in this environment, so `terraform validate` could not be run locally. The snippets were reviewed against the versioned module source, AWS RDS documentation, and AWS provider-facing behavior documented by the module.
