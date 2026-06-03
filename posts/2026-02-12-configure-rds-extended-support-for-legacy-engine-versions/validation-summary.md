# Validation Summary: How to Configure RDS Extended Support for Legacy Engine Versions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS Extended Support
- Amazon Aurora Extended Support
- RDS for MySQL
- RDS for PostgreSQL
- Aurora MySQL
- Aurora PostgreSQL
- AWS CLI for RDS, EventBridge, and Cost Explorer
- Boto3 for Amazon RDS

## Sources Consulted
- Amazon RDS User Guide: Amazon RDS Extended Support with Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/extended-support.html
- Amazon RDS User Guide: Creating a DB instance or Multi-AZ DB cluster with Amazon RDS Extended Support - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/extended-support-creating-db-instance.html
- Amazon RDS User Guide: Amazon RDS Extended Support charges - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/extended-support-charges.html
- Amazon RDS User Guide: Viewing support dates for engine versions in Amazon RDS Extended Support - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/extended-support-viewing-support-dates.html
- Amazon RDS User Guide: MySQL on Amazon RDS versions - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html
- Amazon RDS User Guide: Major version upgrades for RDS for MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.MySQL.Major.html
- Amazon RDS User Guide: Upgrading a MySQL DB snapshot engine version - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-upgrade-snapshot.html
- Amazon RDS for PostgreSQL Release Notes: Release calendars for Amazon RDS for PostgreSQL - https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html
- Amazon Aurora User Guide: Amazon RDS Extended Support with Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/extended-support.html
- Amazon Aurora Release Notes: Release calendars for Amazon Aurora MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.release-calendars.html
- Amazon Aurora Release Notes: Release calendars for Aurora PostgreSQL - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html
- AWS CLI Command Reference: create-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI Command Reference: describe-db-engine-versions - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-engine-versions.html
- AWS CLI Command Reference: restore-db-instance-from-db-snapshot - https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-instance-from-db-snapshot.html
- AWS CLI Command Reference: modify-db-snapshot - https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-snapshot.html
- AWS CLI Command Reference: modify-db-cluster - https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-cluster.html
- AWS Cloud Financial Management Blog: Estimating the charges for Amazon RDS Extended Support - https://aws.amazon.com/blogs/aws-cloud-financial-management/estimating-the-charges-for-amazon-rds-extended-support/

## Issues Found
- The Extended Support behavior description implied all databases automatically enter Extended Support at end of standard support. AWS documents that this depends on whether Extended Support is enabled; if disabled, RDS upgrades the database to a supported version on or shortly after the end of standard support date. Updated the explanation.
- The supported-version list was outdated for June 2026. PostgreSQL 12 and 13 are now in Extended Support, MySQL 8.0 reaches RDS end of standard support on July 31, 2026, and Aurora PostgreSQL 12 and 13 are also Extended Support-active. Updated the list.
- The cost description said Extended Support is always charged per vCPU-hour. AWS pricing uses vCPU-hours for provisioned instances and ACU-hours for Aurora Serverless v2. Added that caveat.
- The opt-out section only recommended choosing a supported version. AWS documents the actual opt-out control as `--engine-lifecycle-support open-source-rds-extended-support-disabled` for supported create and restore flows. Added the flag and replaced the support-status command with `describe-db-major-engine-versions`.
- The new-instance example used MySQL `8.0.36`, which is not a good current standard-support example in June 2026. Updated it to MySQL `8.4.7`.
- The Python estimator only included PostgreSQL 11 as Extended Support-active. Updated it to include PostgreSQL 12 and 13.
- The testing flow attempted to pass `--engine-version` to `restore-db-instance-from-db-snapshot`, which the AWS CLI command does not support. Changed the flow to restore the snapshot first and then run `modify-db-instance` on the restored test instance.
- The pre-upgrade check example used `describe-db-instances` and `PendingModifiedValues`, which does not run MySQL upgrade prechecks. AWS runs mandatory MySQL prechecks automatically when an upgrade is started and logs details in `PrePatchCompatibility.log`; updated the explanation and replaced the command with a valid upgrade-target query.
- The production upgrade command said it would run during a maintenance window but included `--apply-immediately`. Removed `--apply-immediately` from the production RDS and Aurora examples so the wording and behavior match.
- The reminders section called an EventBridge scheduled rule a CloudWatch alarm. Updated the wording to EventBridge rule.

## Review Notes
- The AWS CLI was not installed locally in this environment, so command validation was performed against the official AWS CLI command reference rather than local `aws --help` output.
- RDS Extended Support pricing varies by engine, year, and Region. The post still uses `$0.10` as an example rate, which is acceptable because it explicitly tells readers to check current AWS pricing.
- The cost estimator remains intentionally approximate and uses a partial instance class to vCPU mapping. A production-grade estimator should query pricing and instance metadata dynamically across all Regions and include Aurora clusters, readers, and Multi-AZ standby capacity.
