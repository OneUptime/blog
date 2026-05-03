# Validation Summary: How to Deploy Amazon Aurora with OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code Guide

## Technologies Covered
- OpenTofu / Terraform AWS provider (`hashicorp/aws`)
- Amazon Aurora (PostgreSQL-compatible, 15.4)
- AWS RDS (`aws_rds_cluster`, `aws_rds_cluster_instance`, `aws_rds_cluster_parameter_group`, `aws_rds_global_cluster`)
- AWS Application Auto Scaling for Aurora readers (`aws_appautoscaling_target`, `aws_appautoscaling_policy`)
- AWS KMS (referenced via `aws_kms_key`)
- AWS IAM (referenced via `aws_iam_role` for Enhanced Monitoring)
- Aurora Global Database (multi-region)

## Sources Consulted
- Terraform AWS provider — `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider — `aws_rds_cluster_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS provider — `aws_rds_cluster_parameter_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_parameter_group
- Terraform AWS provider — `aws_rds_global_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_global_cluster
- Terraform AWS provider — `aws_appautoscaling_target` / `aws_appautoscaling_policy` (Aurora reader scaling examples)
- AWS docs — Working with DB cluster parameter groups (Aurora): https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithDBClusterParamGroups.html
- AWS announcement — Aurora PostgreSQL 15.4 GA (2023-10-26): https://aws.amazon.com/about-aws/whats-new/2023/10/amazon-aurora-postgresql-compatible-15-4/

## Issues Found
1. **Misleading comment in the cluster block.** The line `# Enable auto minor version upgrades` was placed directly above `enable_http_endpoint = false`. The `enable_http_endpoint` argument has nothing to do with minor version upgrades — it strictly toggles the Aurora **Data API (HTTP endpoint)**. The actual auto-minor-version-upgrade control is `auto_minor_version_upgrade` on `aws_rds_cluster_instance`, not on the cluster. Replaced the comment with `# Data API (optional HTTP endpoint)` and removed the now-redundant inline `# Data API (optional)` comment so the section header accurately describes the argument it precedes.

## Review Notes
- Aurora PostgreSQL 15.4 is a real released minor version (GA October 2023), but by the validation date (2026-05-03) several newer 15.x minors are available. Readers should pick the latest supported 15.x minor; the engine_version field in the post is illustrative rather than a recommendation.
- The example references `aws_db_subnet_group.aurora`, `aws_security_group.aurora`, `aws_kms_key.aurora`, `aws_iam_role.rds_monitoring`, `aws_db_parameter_group.aurora_pg_instance`, and `data.aws_availability_zones.available` without defining them. This is consistent with the post's intent (snippets focused on the Aurora resources themselves), so no changes were made.
- The Application Auto Scaling configuration (`service_namespace = "rds"`, `scalable_dimension = "rds:cluster:ReadReplicaCount"`, `predefined_metric_type = "RDSReaderAverageCPUUtilization"`) matches the canonical Aurora reader scaling example in the AWS provider docs verbatim.
- The Aurora Global Database snippet is intentionally truncated (`# ...`); secondary-region cluster wiring is omitted but the primary cluster + global cluster shape shown is correct.
- `final_snapshot_identifier = ... : null` is valid HCL — Terraform/OpenTofu treat `null` as "argument not set," which is the desired behavior in non-prod where `skip_final_snapshot = true`.
