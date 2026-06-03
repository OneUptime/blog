# Validation Summary: How to Create an Aurora PostgreSQL Cluster

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Aurora PostgreSQL
- Amazon RDS and AWS CLI
- Amazon EC2 security groups
- Amazon CloudWatch metrics and alarms
- PostgreSQL SQL roles, grants, and extensions
- Python psycopg2 connection pooling

## Sources Consulted
- AWS Aurora User Guide: Creating an Amazon Aurora DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.CreateInstance.html
- AWS Aurora User Guide: Amazon Aurora storage: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html
- AWS Aurora User Guide: Quotas and constraints for Amazon Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_Limits.html
- AWS Aurora User Guide: Aurora PostgreSQL parameters: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Reference.ParameterGroups.html
- AWS Aurora User Guide: Publishing Aurora PostgreSQL logs to CloudWatch Logs: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.CloudWatch.Publishing.html
- AWS Aurora User Guide: Turning Performance Insights on and off for Aurora / Database Insights mode: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.Enabling.html
- AWS Aurora User Guide: Amazon CloudWatch metrics for Amazon Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- AWS CLI Command Reference: rds create-db-cluster: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
- AWS CLI Command Reference: rds create-db-instance: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI Command Reference: ec2 authorize-security-group-ingress: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- PostgreSQL documentation: CREATE ROLE / CREATE USER and GRANT: https://www.postgresql.org/docs/current/sql-createrole.html, https://www.postgresql.org/docs/current/sql-grant.html
- psycopg2 documentation: connection pools: https://www.psycopg.org/docs/pool.html

## Issues Found
- The storage claim said Aurora PostgreSQL automatically scales from 10 GB to 128 TB. Updated it to say storage grows automatically and that the Aurora PostgreSQL 16.2 example can grow to 128 TiB, while newer supported versions can grow higher. This matches AWS's version-specific Aurora size limits.
- The post said to wait for the Aurora cluster to become available immediately after `create-db-cluster`. With AWS CLI creation, Aurora cluster endpoints remain `Creating` until the first primary DB instance is explicitly created. Updated the wording to describe the status check correctly.
- The Performance Insights examples omitted the current `--database-insights-mode` setting. Added `--database-insights-mode standard` to each instance creation command, matching current AWS guidance for Performance Insights and CloudWatch Database Insights.
- The second reader command claimed it created the reader in a different AZ, but the command did not explicitly select an AZ. Updated the comment to tie AZ distribution to the multi-AZ DB subnet group instead of promising a specific placement from that command alone.
- The replica lag alarm used `AuroraReplicaLag` with a `DBClusterIdentifier` dimension. `AuroraReplicaLag` is replica instance-level; changed the alarm to `AuroraReplicaLagMaximum`, which is the cluster-level metric for maximum replica lag.

## Review Notes
The walkthrough remains version-specific to Aurora PostgreSQL 16.2. For a future refresh, consider updating the engine version to a current regional default and mentioning that Performance Insights has an AWS-announced end-of-life date of June 30, 2026, with CloudWatch Database Insights becoming the primary console experience.
