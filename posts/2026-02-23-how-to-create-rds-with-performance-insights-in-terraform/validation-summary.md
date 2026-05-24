# Validation Summary: How to Create RDS with Performance Insights in Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (1.0+)
- AWS RDS (PostgreSQL 15, MySQL 8.0)
- AWS Performance Insights
- AWS Enhanced Monitoring
- AWS KMS
- AWS IAM
- AWS CloudWatch Alarms
- AWS SNS
- AWS VPC / Subnet / Security Groups

## Sources Consulted
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS docs — Enabling Performance Insights: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Enabling.html
- AWS docs — Performance Insights retention pricing/values: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html
- AWS docs — Performance Insights CloudWatch metrics (DBLoad, DBLoadCPU, DBLoadNonCPU): https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Cloudwatch.html
- AWS docs — Enhanced Monitoring setup and intervals: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- AWS docs — Performance Insights API IAM actions: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonrdsperformanceinsights.html
- AWS managed policy `AmazonRDSEnhancedMonitoringRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonRDSEnhancedMonitoringRole.html
- Terraform `aws_kms_key`, `aws_cloudwatch_metric_alarm`, `aws_iam_role`, `aws_db_subnet_group` resource docs

## Issues Found
No technical issues found.

Verified specifics:
- `performance_insights_enabled`, `performance_insights_retention_period`, and `performance_insights_kms_key_id` are valid `aws_db_instance` arguments.
- Retention period values listed in the comment (7 free, 31, 62, 93, ..., 731) match the AWS-documented allowed values (7, any multiple of 31 between 31 and 731, or 731).
- Enhanced Monitoring `monitoring_interval` values used (1 and 10) are within the valid set {0, 1, 5, 10, 15, 30, 60}.
- CloudWatch metrics `DBLoad` and `DBLoadNonCPU` exist in the `AWS/RDS` namespace.
- Trust policy service principal `monitoring.rds.amazonaws.com` and managed policy ARN `arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole` are correct.
- All `pi:*` actions listed (`DescribeDimensionKeys`, `GetDimensionKeyDetails`, `GetResourceMetadata`, `GetResourceMetrics`, `ListAvailableResourceDimensions`, `ListAvailableResourceMetrics`) are valid Performance Insights API actions.
- Performance Insights resource ARN format `arn:aws:pi:region:account:metrics/rds/*` matches the documented format.
- KMS key policy structure with root principal plus a conditional service-principal statement (`kms:ViaService = rds.<region>.amazonaws.com` and `kms:CallerAccount` condition) is a sound pattern.
- Engine versions (`postgres "15"`, `mysql "8.0"`) and Graviton2 instance classes (`db.r6g.large`, `db.r6g.xlarge`, `db.r6g.2xlarge`) all support Performance Insights.
- `cidrsubnet("10.0.0.0/16", 8, count.index + 10)` correctly produces /24 subnets.

## Review Notes
- The post correctly notes that retention beyond 7 days incurs cost; readers should be aware that "Long Term" retention (>7 days) is billed per vCPU-month per AWS PI pricing.
- The `username = "admin"` is allowed by RDS as a master username for both PostgreSQL and MySQL, though `admin` is a reserved word for the MySQL admin account — RDS accepts it without issue at provisioning time.
- The KMS key policy `Principal = "*"` for the PI service statement is broad, but is appropriately scoped down by the `kms:ViaService` and `kms:CallerAccount` conditions — a common AWS pattern.
- `engine_version = "15"` lets AWS select the latest available 15.x patch version, which is acceptable for major-version-only pinning. Production users may prefer explicit patch versions for change control.
- Performance Insights for RDS PostgreSQL on `db.r6g.large` and larger / MySQL on `db.r6g.large` and larger are all supported (PI is supported on all current-generation instance classes for these engines).
