# Validation Summary: How to Configure Database Maintenance Windows in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon RDS
- Amazon Aurora PostgreSQL
- Amazon ElastiCache for Redis
- Amazon DocumentDB
- Amazon Neptune
- Amazon EventBridge / CloudWatch Events
- Amazon SNS

## Sources Consulted
- Terraform AWS Provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_rds_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS Provider `aws_rds_cluster_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS Provider `aws_elasticache_replication_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS Provider `aws_docdb_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster
- Terraform AWS Provider `aws_docdb_cluster_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster_instance
- Terraform AWS Provider `aws_neptune_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/neptune_cluster
- Terraform AWS Provider `aws_cloudwatch_event_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Amazon RDS maintenance window documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Maintenance.html
- Amazon RDS Multi-AZ failover documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- Amazon RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon Aurora PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/AuroraPostgreSQL.Updates.html
- Amazon RDS EventBridge event reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-rds.html
- Amazon RDS event categories and messages: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- OneUptime linked blog post: https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view

## Issues Found
- The Multi-AZ maintenance explanation was too broad. Amazon RDS documentation distinguishes operating system maintenance, which can require a short failover, from database engine upgrades, where both primary and standby DB instances can be unavailable. Updated the explanation to reflect that distinction.
- The RDS PostgreSQL examples used `engine_version = "15.4"`, which Amazon RDS now lists as past standard support. Updated those examples to `15.16`, a current PostgreSQL 15 RDS minor version.
- The Aurora PostgreSQL example used `engine_version = "15.4"`, which is older than current Aurora PostgreSQL 15 releases. Updated it to `15.17`, which is listed in the current Aurora PostgreSQL release notes.
- The DocumentDB instance example set `auto_minor_version_upgrade = true`, but the Terraform provider documents that this parameter does not apply to Amazon DocumentDB and DocumentDB does not perform minor version upgrades regardless of the value. Removed the setting from that example.
- The EventBridge rule used `detail_type` inside `jsonencode`, which would produce a JSON key named `detail_type`. EventBridge event patterns require `detail-type`. Updated the Terraform object key to `"detail-type"`.
- The auto minor version upgrade guidance was worded as if it applied to every service in the post. Narrowed it to services that support the setting and updated the best-practices sentence accordingly.

## Review Notes
Terraform CLI was not installed in the local environment, so validation was performed against official Terraform AWS Provider and AWS service documentation rather than a local `terraform validate` run. The examples still reference surrounding resources such as subnet groups and security groups that are intentionally not defined in the post.
