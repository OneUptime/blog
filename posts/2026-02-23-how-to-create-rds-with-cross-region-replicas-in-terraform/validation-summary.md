# Validation Summary: How to Create RDS with Cross-Region Replicas in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, 1.0+)
- AWS RDS (PostgreSQL)
- AWS RDS Cross-Region Read Replicas
- AWS KMS (encryption + key rotation)
- AWS VPC / Subnets / Security Groups
- AWS IAM (Enhanced Monitoring service role)
- AWS CloudWatch (metric alarms, `ReplicaLag`)
- AWS multi-provider configuration (aliased providers)

## Sources Consulted
- Terraform AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_kms_key` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- Terraform AWS provider `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS RDS read replica documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- AWS RDS cross-region read replicas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html
- AWS RDS Enhanced Monitoring IAM role: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- AWS CloudWatch metrics for RDS (`ReplicaLag`): https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Terraform `cidrsubnet` function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet

## Issues Found
No technical issues found.

Verified specifically:
- `replicate_source_db = aws_db_instance.primary.arn` — correct; cross-region read replicas require the source DB ARN (not just the identifier) as documented in the AWS provider.
- `kms_key_id` set in the replica region — correct; cross-region replicas of an encrypted source require a KMS key in the destination region.
- `multi_az = true` on a read replica — supported.
- `ReplicaLag` in namespace `AWS/RDS` with dimension `DBInstanceIdentifier` — correct CloudWatch metric for RDS PostgreSQL read replicas.
- `monitoring.rds.amazonaws.com` service principal and `arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole` — both correct for Enhanced Monitoring.
- `monitoring_interval = 30` — valid (allowed values: 0, 1, 5, 10, 15, 30, 60).
- `db.r6g.xlarge` / `db.r6g.large` and `storage_type = "gp3"` — supported for RDS PostgreSQL.
- `cidrsubnet("10.0.0.0/16", 8, 10..12)` produces valid `/24` subnets (`10.0.10.0/24`, `10.0.11.0/24`, `10.0.12.0/24`).
- The comment block noting that `db_name`, `username`, `password`, `engine`, and `engine_version` should not be set on replicas is consistent with AWS RDS replica behavior (these are inherited from the source).
- `final_snapshot_identifier` paired with `skip_final_snapshot = false` on the primary is correct.

## Review Notes
- `engine_version = "15"` is accepted and will resolve to the latest available 15.x minor; pinning a specific minor (e.g., `"15.7"`) is generally preferred to avoid drift on minor upgrades, but this is a stylistic choice, not an error.
- `performance_insights_enabled = true` works without `performance_insights_kms_key_id` (the AWS managed key is used). For stricter encryption posture, a customer-managed key can be specified — out of scope for this post.
- The CloudWatch alarm has no `alarm_actions` configured (no SNS topic), so it will change state without notifying anyone. This is consistent with the post's scope of showing the alarm definition, not a bug.
- The primary uses `username = "admin"`, which is valid for RDS PostgreSQL (only `rdsadmin` is reserved). Using the conventional `postgres` is also an option.
