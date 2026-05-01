# Validation Summary: How to Deploy Aurora MySQL Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Provider for OpenTofu/Terraform
- Amazon Aurora MySQL
- Amazon RDS
- CloudWatch Logs
- Performance Insights
- Enhanced Monitoring

## Sources Consulted
- AWS Provider `aws_rds_cluster` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster.html.markdown
- AWS Provider `aws_rds_cluster_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster_instance.html.markdown
- AWS Provider `aws_rds_cluster_parameter_group` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster_parameter_group.html.markdown
- AWS Provider `aws_db_parameter_group` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_parameter_group.html.markdown
- Aurora MySQL configuration parameters: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.ParameterGroups.html
- Overview of Aurora MySQL database logs: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_LogAccess.MySQL.LogFileSize.html
- Publishing Amazon Aurora MySQL logs to Amazon CloudWatch Logs: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.CloudWatch.html
- Using Advanced Auditing with an Amazon Aurora MySQL DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Auditing.html
- Aurora MySQL database engine updates 2026-01-02 (version 3.04.6): https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.Updates.3046.html
- Release calendars for Amazon Aurora MySQL: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.release-calendars.html
- What is Amazon Aurora?: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html
- Amazon Aurora storage: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html
- High availability for Amazon Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html
- Cluster endpoints for Amazon Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Cluster.html
- Reader endpoints for Amazon Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Reader.html
- Overview of backing up and restoring an Aurora DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Managing.Backups.html
- OpenTofu CLI command overview: https://opentofu.org/docs/cli/commands/
- OpenTofu `init` command: https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/

## Issues Found
1. The example pinned `engine_version = "8.0.mysql_aurora.3.04.0"`, which is an older patch in the Aurora MySQL 3.04 LTS line. AWS release notes show `3.04.6` as the current 3.04 patch release, so I updated the example to `8.0.mysql_aurora.3.04.6`.
2. The cluster instances enabled `auto_minor_version_upgrade = true` on an Aurora MySQL LTS release. AWS explicitly recommends not setting `AutoMinorVersionUpgrade` to `true` for Aurora MySQL LTS versions, so I changed both writer and reader instances to `auto_minor_version_upgrade = false`.
3. The cluster exported `audit` and `general` logs to CloudWatch, but the parameter groups only enabled slow query logging. AWS documentation says non-error logs must be explicitly enabled before export. I changed `enabled_cloudwatch_logs_exports` to `["error", "slowquery"]` so the example matches the logs it actually enables.
4. The cluster hard-coded `availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]` even though the prerequisites only require an existing VPC and private subnets. In practice, that makes the example region-specific and can conflict with the caller's DB subnet group. I removed the hard-coded AZ list so the example can use the subnet group without assuming `us-east-1`.

## Review Notes
- The post is technically sound after the corrections above. The Aurora architecture, endpoint behavior, backup description, read-replica count, and OpenTofu workflow commands all match the referenced documentation.
- The example still uses `master_password`, which the AWS provider stores in state. For production use, `manage_master_user_password` is worth considering, but the current configuration is still valid.
- Local CLI verification was not possible because `tofu` is not installed in this environment, so the command review was done against official OpenTofu documentation.
