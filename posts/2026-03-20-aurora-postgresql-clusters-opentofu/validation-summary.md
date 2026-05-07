# Validation Summary: How to Deploy Aurora PostgreSQL Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- HCL configuration language
- AWS Terraform provider resources for RDS/Aurora, IAM, Secrets Manager, and Random
- Amazon Aurora PostgreSQL
- Amazon RDS IAM database authentication
- AWS CLI

## Sources Consulted
- [OpenTofu `init` command documentation](https://opentofu.org/docs/cli/init/)
- [OpenTofu `plan` command documentation](https://opentofu.org/docs/cli/commands/plan/)
- [OpenTofu `apply` command documentation](https://opentofu.org/docs/v1.11/cli/commands/apply/)
- [Terraform AWS provider `aws_rds_cluster` resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster)
- [HashiCorp example using `aws_rds_cluster_instance` with Aurora PostgreSQL](https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage/connect-database/aurora)
- [AWS CLI `describe-db-clusters` reference](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-clusters.html)
- [What is Amazon Aurora?](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html)
- [High availability for Amazon Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html)
- [Regions and Availability Zones for Amazon Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.RegionsAndAvailabilityZones.html)
- [Amazon Aurora PostgreSQL parameters](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Reference.ParameterGroups.html)
- [Parameters for logging in Aurora PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_LogAccess.Concepts.PostgreSQL.overview.parameter-groups.html)
- [Security with Amazon Aurora PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Security.html)
- [IAM database authentication for Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.html)
- [Creating and using an IAM policy for IAM database access](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html)
- [Amazon Aurora PostgreSQL releases and engine versions](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Updates.20180305.html)
- [Supported Regions and Aurora DB engines for Performance Insights](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.PerfInsights.html)

## Issues Found
1. **Throughput claim was too absolute**: The introduction said Aurora PostgreSQL offers "three times the throughput" of standard PostgreSQL. AWS documents this as "up to three times" and qualifies it by workload. Updated the sentence to match the official wording more closely.
2. **Failover timing claim was too strong**: The introduction stated failover is typically under 30 seconds. AWS documents that service is typically restored in less than 60 seconds and often in less than 30 seconds. Updated the sentence accordingly.
3. **Description overstated the tutorial scope**: The post description said the article covered both cluster and instance parameter groups, but the code only creates and associates a cluster parameter group. Updated the description so it matches the implementation shown.

## Review Notes
- The OpenTofu commands (`tofu init`, `tofu plan`, `tofu apply`) are correct.
- The `aws rds describe-db-clusters` verification command is valid, and the JMESPath query shape is compatible with the AWS CLI response.
- The Terraform/OpenTofu resource arguments used for the Aurora cluster, instances, Secrets Manager secret version, and IAM database-auth policy are technically consistent with current provider and AWS documentation.
- `engine_version = "16.1"` is a valid Aurora PostgreSQL 16 engine version, but it pins an older 16.x minor release rather than tracking newer Aurora PostgreSQL 16 minors.
- The `rds.force_ssl` guidance is correct for Aurora PostgreSQL 16. AWS notes that Aurora PostgreSQL 17 and later default `rds.force_ssl` to `1`, while 16 and earlier default it to `0`.
- AWS has announced end-of-life for the Performance Insights console experience and flexible retention on June 30, 2026. The post's current configuration is still valid as of 2026-05-07, but future revisions should account for the transition to CloudWatch Database Insights.
