# Validation Summary: How to Handle Database Cost Optimization with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS RDS (PostgreSQL)
- Aurora Serverless v2 (aurora-postgresql)
- AWS Backup (backup plans, vaults, selections, lifecycle/cold storage)
- AWS EBS storage types (gp2, gp3, io1) as used by RDS
- Graviton-based RDS instance classes (r6g, t4g)
- Terraform AWS provider resources: `aws_db_instance`, `aws_rds_cluster`, `aws_rds_cluster_instance`, `aws_backup_plan`, `aws_backup_vault`, `aws_backup_selection`

## Sources Consulted
- Terraform AWS provider documentation for `aws_db_instance` (arguments: `storage_type`, `iops`, `storage_throughput`, `max_allocated_storage`, `backup_retention_period`, `copy_tags_to_snapshot`, `deletion_protection`, `skip_final_snapshot`)
- Terraform AWS provider documentation for `aws_rds_cluster` and `serverlessv2_scaling_configuration` block
- Terraform AWS provider documentation for `aws_backup_plan`, `aws_backup_vault`, `aws_backup_selection`
- AWS RDS documentation on storage types (gp2/gp3/io1 baselines and behavior)
- AWS Aurora Serverless v2 documentation (engine_mode=provisioned, ACU capacity range, db.serverless instance class)
- AWS Backup documentation on lifecycle rules (cold_storage_after, delete_after, 90-day minimum cold storage retention)

## Issues Found
No technical issues found. All code examples use current, non-deprecated APIs and resource arguments. The Terraform HCL is syntactically valid. The Aurora Serverless v2 configuration correctly uses `engine_mode = "provisioned"` with the `serverlessv2_scaling_configuration` block (the modern pattern). AWS Backup lifecycle constraints are satisfied (cold_storage_after=30, delete_after=365 leaves 335 days, well above the 90-day minimum). The gp3 baseline values (3000 IOPS, 125 MB/s throughput) are accurate.

## Review Notes
- The pricing block in "Optimizing Storage Costs" is explicitly labeled "as of 2024" and the specific numbers reflect EBS-style pricing rather than RDS-storage pricing in every region. The directional claims (gp3 generally cheaper than gp2/io1 for typical RDS workloads, gp2 IOPS scales 3 per GB, io1 charges per provisioned IOPS) are accurate. Readers should re-verify exact dollar amounts in the AWS pricing calculator for their region.
- Aurora Serverless v2 now supports `min_capacity = 0` (auto-pause, available since November 2024). The post's `min_capacity = 0.5` is still valid and a reasonable choice when sub-second resume from idle matters.
- The post's tag list includes "Reserved Instances" but the body does not actually cover RDS Reserved Instances or Savings Plans. This is a content/tag mismatch rather than a technical error, so it has been left untouched per the "do not restructure" guidance.
- For RDS gp3, omitting the `iops` argument lets the resource default to the 3000 IOPS baseline; setting it explicitly to 3000 (as shown) is also valid and harmless.
- `aws_iam_role.backup` is referenced by `aws_backup_selection` but is not defined inside the snippet — this is acceptable for a focused example showing only the backup-related resources, and the reader is expected to supply the IAM role separately.
