# Validation Summary: How to Enable RDS Automated Backups in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon RDS
- RDS automated backups and point-in-time recovery
- RDS automated backup replication
- RDS DB snapshots and snapshot copies
- Amazon EventBridge
- Amazon SNS
- Amazon CloudWatch alarms
- AWS CLI

## Sources Consulted
- Terraform AWS Provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_db_instance_automated_backups_replication` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance_automated_backups_replication
- Terraform AWS Provider `aws_db_snapshot` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_snapshot
- Terraform AWS Provider `aws_db_snapshot` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_snapshot
- Terraform AWS Provider `aws_db_snapshot_copy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_snapshot_copy
- Terraform AWS Provider `aws_cloudwatch_event_target` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Amazon RDS automated backups documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html
- Amazon RDS backup window documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ManagingAutomatedBackups.html
- Amazon RDS cross-Region automated backup replication documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/AutomatedBackups.Replicating.Enable.html
- Amazon RDS supported engines for cross-Region automated backups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.CrossRegionAutomatedBackups.html
- Amazon RDS events in EventBridge: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-rds.html
- EventBridge target permissions documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS CLI `restore-db-instance-to-point-in-time` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-instance-to-point-in-time.html
- Amazon RDS pricing / backup storage information: https://aws.amazon.com/rds/pricing/

## Issues Found
- Corrected the description of daily automated snapshots. The original said daily snapshots are full snapshots; AWS documents the first DB instance snapshot as full and subsequent snapshots as incremental.
- Qualified the Multi-AZ backup behavior. The original implied all Multi-AZ backups avoid primary I/O suspension; AWS documents this as true for MariaDB, MySQL, Oracle, and PostgreSQL, with SQL Server and Db2 exceptions.
- Replaced `timestamp()` in `final_snapshot_identifier` with a stable identifier. Using `timestamp()` in Terraform resource arguments causes unstable plans.
- Replaced `timestamp()` in the manual snapshot identifier with a user-supplied `snapshot_suffix`, avoiding forced replacement on each plan.
- Fixed the snapshot copy example. `aws_db_snapshot_copy.source_db_snapshot_identifier` must reference a snapshot identifier or ARN, not the DB instance ID; the post now uses the `aws_db_snapshot` data source to find the latest automated snapshot.
- Replaced dynamic `timestamp()` archive tags and identifiers with user-supplied archive values to avoid recurring Terraform diffs.
- Fixed the EventBridge event pattern by quoting `"detail-type"`, which is required because the key contains a hyphen.
- Added an SNS topic policy allowing `events.amazonaws.com` to publish to the topic, which is required for EventBridge-to-SNS delivery in Terraform-managed configurations.
- Clarified backup storage pricing. Manual snapshots count toward RDS backup storage and can incur charges; they are not accurately described as always charged independently of the included regional backup allocation.

## Review Notes
Terraform is not installed in this workspace, so `terraform fmt` and `terraform validate` could not be run locally. The snippets were reviewed manually against official Terraform AWS provider and AWS documentation.
