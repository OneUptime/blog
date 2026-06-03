# Validation Summary: How to Create an Aurora MySQL Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Aurora MySQL
- Amazon RDS
- AWS CLI
- Amazon CloudWatch
- AWS KMS
- MySQL Connector/Python

## Sources Consulted
- AWS CLI `create-db-cluster` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
- AWS CLI `create-db-instance` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI `modify-db-instance` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS CLI `create-db-subnet-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-subnet-group.html
- AWS CLI `create-db-cluster-parameter-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster-parameter-group.html
- AWS CLI `put-metric-alarm` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon Aurora storage documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html
- Amazon Aurora replication documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html
- Amazon Aurora quotas and size limits: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_Limits.html
- Amazon Aurora MySQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.release-calendars.html
- Aurora MySQL 3.12.0 release notes: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.Updates.3120.html
- Aurora MySQL 3.07.1 release notes: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.Updates.3071.html
- Amazon Aurora endpoint documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Cluster.html and https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Reader.html
- Amazon Aurora failover documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-failover.html
- Amazon Aurora CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- Amazon Aurora CloudWatch dimensions documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/dimensions.html
- MySQL Connector/Python Developer Guide: https://dev.mysql.com/doc/connector-python/en/

## Issues Found
- The storage limit claim said Aurora auto-scales from 10 GB to 128 TB. Current Aurora MySQL 3.10 and higher releases support cluster volumes up to 256 TiB, so the claim was updated.
- The replica lag claim said sub-10 ms. AWS documents Aurora Replica lag as usually much less than 100 ms, so the wording was corrected.
- The cost comparison claimed Aurora instances are roughly 20% more expensive than equivalent RDS MySQL instances. Pricing varies by Region, instance class, storage mode, and I/O usage, so this was replaced with a workload-based comparison note.
- The cluster creation command pinned `8.0.mysql_aurora.3.07.1`, which is deprecated and past standard support. It was updated to `8.0.mysql_aurora.3.12.0`, a currently supported Aurora MySQL 8.0-compatible release as of the review date.
- The application example connects to database `myapp`, but the cluster creation command did not create that initial database. Added `--database-name myapp`.
- The failover priority commands changed `--promotion-tier` without `--apply-immediately`, so the change could wait until the next maintenance window. Added `--apply-immediately`.
- The replica lag alarm used the instance-level `AuroraReplicaLag` metric with only a cluster dimension. Changed it to the cluster-level `AuroraReplicaLagMaximum` metric for maximum lag across readers.

## Review Notes
- The AWS CLI was not installed locally in the workspace, so CLI syntax was validated against the current official AWS CLI command reference rather than local `--help` output.
- Performance Insights remains valid on the review date, but AWS documentation states that the Performance Insights console experience and flexible retention pricing end on June 30, 2026. The sample uses the default 7-day retention period, so no README change was required.
