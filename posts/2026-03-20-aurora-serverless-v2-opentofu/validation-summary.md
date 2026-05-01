# Validation Summary: How to Deploy Aurora Serverless v2 with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Aurora Serverless v2
- Amazon RDS
- Amazon CloudWatch
- AWS CLI
- HCL

## Sources Consulted
- AWS Aurora User Guide: Requirements and limitations for Aurora Serverless v2 - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.requirements.html
- AWS Aurora User Guide: Supported Regions and Aurora DB engines for Aurora serverless - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.html
- AWS Aurora User Guide: Performance and scaling for Aurora serverless - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html
- AWS Aurora User Guide: How Aurora Serverless v2 works - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html
- AWS Aurora User Guide: Amazon CloudWatch metrics for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- AWS CLI Command Reference: `get-metric-statistics` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- OpenTofu CLI docs: Basic CLI Features - https://opentofu.org/docs/cli/commands/
- OpenTofu CLI docs: `tofu init` - https://opentofu.org/docs/cli/init/
- OpenTofu CLI docs: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: `tofu apply` - https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform Registry: `aws_rds_cluster` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster

## Issues Found
- The `aws_rds_cluster` example omitted `engine_mode = "provisioned"`. Aurora Serverless v2 uses the provisioned engine mode together with `db.serverless` instances, so I added the explicit setting.
- The prerequisites claimed fixed supported engine-version minimums. AWS documents Aurora Serverless v2 engine availability by Region and engine version, so I changed the prerequisite to require a Region-supported Aurora PostgreSQL version instead of a global version floor.
- The introduction said Aurora Serverless v2 works with "all Aurora features". AWS documents provisioned-only exceptions such as Database Activity Streams and cluster cache management for Aurora PostgreSQL, so I narrowed that claim to "many Aurora features".
- The first CloudWatch alarm used the cluster-level `ServerlessDatabaseCapacity` metric while describing an alert for approaching maximum ACU capacity. At cluster level, that metric is an average across instances, which can hide a saturated writer when readers are idle. I changed the alarm to use `DBInstanceIdentifier` for the writer instance.
- The second CloudWatch alarm used `ACUUtilization` with `DBClusterIdentifier`, but AWS documents `ACUUtilization` as an instance-level Aurora metric. I changed it to use `DBInstanceIdentifier` and renamed the alarm to match what it actually measures.
- The example `aws cloudwatch get-metric-statistics` command queried cluster-level capacity even though the post creates both a writer and a reader. I changed the example to query the writer instance directly so it matches the per-instance monitoring model used elsewhere in the post.
- The conclusion described Aurora Serverless v2 as scaling in "sub-second increments" and referred to "cold start delays" at `0.5` ACU. AWS documents 0.5-ACU scaling granularity and notes that scaling speed depends on current/minimum capacity, so I rewrote that sentence to describe fine-grained ACU scaling and slower scale-up more accurately.

## Review Notes
- `engine_version = "16.1"` is valid in many Regions, but Aurora Serverless v2 engine support is Region-specific. Readers should confirm the exact version for their Region before applying.
- Aurora Serverless v2 can scale down to `0` ACUs with auto-pause on newer supported Aurora versions. This post uses `0.5` ACU, which remains valid and avoids depending on auto-pause support.
- The post enables Performance Insights on the instances. AWS notes that some features, including Performance Insights, can influence the practical minimum capacity you choose for production workloads.
