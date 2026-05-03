# Validation Summary: How to Deploy Aurora Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS Aurora (PostgreSQL-compatible)
- AWS RDS (`aws_rds_cluster`, `aws_rds_cluster_instance`)
- Aurora Serverless v2

## Sources Consulted
- Terraform AWS provider docs for `aws_rds_cluster` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster)
- Terraform AWS provider docs for `aws_rds_cluster_instance` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance)
- AWS provider source docs on GitHub (hashicorp/terraform-provider-aws)
- AWS Aurora documentation regarding Serverless v2 engine mode and ACU scaling

## Issues Found
No technical issues found.

The code samples are syntactically valid HCL and use correct, current attribute names:
- `aws_rds_cluster` arguments (`cluster_identifier`, `engine`, `engine_version`, `availability_zones`, `database_name`, `master_username`, `master_password`, `db_subnet_group_name`, `vpc_security_group_ids`, `backup_retention_period`, `preferred_backup_window`, `skip_final_snapshot`, `final_snapshot_identifier`, `deletion_protection`) are all valid.
- `engine_mode = "provisioned"` is the correct setting for Aurora Serverless v2.
- `serverlessv2_scaling_configuration` block with `min_capacity = 0.5` and `max_capacity = 16.0` is valid (allowed range is 0–256 in steps of 0.5).
- `instance_class = "db.serverless"` is the correct value for Serverless v2 cluster instances.
- `db.r6g.large` is a valid Aurora instance class.
- The `endpoint` and `reader_endpoint` attributes exposed on `aws_rds_cluster` are correct.
- The "up to 5x better performance than MySQL" claim is consistent with AWS's standard Aurora MySQL marketing messaging.

## Review Notes
- Aurora PostgreSQL 15.4 was a valid minor version at the time of writing; readers may want to check for the latest patched minor (e.g., 15.x or 16.x) when applying this in production.
- Terraform AWS provider 5.x+ added a write-only `master_password_wo` alternative (Terraform 1.11.0+) that avoids storing the password in state. The post's use of `master_password` with `var.db_password` is still valid but could be mentioned as an upgrade path in a future revision.
- As of late 2024, Aurora Serverless v2 supports `min_capacity = 0` together with `seconds_until_auto_pause` for true auto-pause; the post's `0.5` minimum still works and avoids cold-start latency, so this is a reasonable default rather than an error.
- The cluster definition omits `apply_immediately`, IAM authentication, KMS encryption (`storage_encrypted`/`kms_key_id`), and `enabled_cloudwatch_logs_exports` — all valid omissions for an introductory post but worth noting for production hardening.
