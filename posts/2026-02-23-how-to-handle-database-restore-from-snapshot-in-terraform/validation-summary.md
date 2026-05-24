# Validation Summary: How to Handle Database Restore from Snapshot in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Terraform AWS Provider (~> 5.0)
- AWS RDS (`aws_db_instance`, `aws_db_snapshot` data source, `aws_db_parameter_group`)
- AWS Aurora (`aws_rds_cluster`, `aws_rds_cluster_instance`, `aws_db_cluster_snapshot` data source)
- AWS CloudWatch (`aws_cloudwatch_metric_alarm`)
- AWS SNS (`aws_sns_topic`)
- AWS IAM (referenced via `aws_iam_role`)
- PostgreSQL (parameter group family `postgres15`)

## Sources Consulted
- Terraform AWS Provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider documentation for `aws_db_snapshot` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_snapshot
- Terraform AWS Provider documentation for `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS Provider documentation for `aws_db_cluster_snapshot` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_cluster_snapshot
- Terraform AWS Provider documentation for `aws_rds_cluster_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS Provider documentation for `aws_db_parameter_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS Provider documentation for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform `formatdate` function documentation: https://developer.hashicorp.com/terraform/language/functions/formatdate
- AWS RDS user guide on restoring DB instances from snapshots: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html
- AWS Aurora user guide on restoring clusters from snapshots: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_RestoreFromSnapshot.html

## Issues Found
No technical issues found.

The blog post is technically accurate. All Terraform resource and data source arguments used are valid in the current AWS provider (`~> 5.0`):
- `snapshot_identifier` is correctly used for both `aws_db_instance` and `aws_rds_cluster`.
- The `lifecycle { ignore_changes = [snapshot_identifier] }` pattern is the canonical recommendation to prevent unnecessary recreation on subsequent plans.
- `data.aws_db_snapshot.latest.id` and `data.aws_db_cluster_snapshot.latest.id` return the snapshot identifier, which is appropriate for `snapshot_identifier`.
- The distinction between `backup_window` (on `aws_db_instance`) and `preferred_backup_window` (on `aws_rds_cluster`) is correctly maintained.
- `formatdate("YYYYMMDD", timestamp())` is a valid Terraform expression.
- The parameter group family `postgres15` is a valid PostgreSQL parameter group family.
- The technical claims (password is inherited from snapshot, `allocated_storage` must be >= snapshot size, engine/engine_version inherited from snapshot) are all accurate.

## Review Notes
- Using `timestamp()` inside `identifier` for the `restore_test` resource will cause the identifier to change on every plan/apply, which can lead to plan churn or recreation. Readers should be aware this is intentional only for one-shot restore tests; for repeatable applies, a stable identifier source (e.g., a variable) would be safer. This is a usability concern rather than a technical error.
- When restoring an `aws_db_instance` from a snapshot, `username` is intentionally omitted (correct — it's inherited). Setting `username` to a different value than the snapshot would cause a Terraform diff/apply issue. The post correctly avoids this pitfall.
- The Aurora cluster example does not set `engine_version` on `aws_rds_cluster`; it will be inherited from the snapshot. The downstream `aws_rds_cluster_instance` references `aws_rds_cluster.restored_aurora.engine_version` as a computed attribute, which is correct.
- The "primary" / "replica" role tag on cluster instances based on `count.index == 0` is informational only — Aurora itself chooses which instance is the writer; the tag does not influence behavior.
- The post references provider version `~> 5.0`. As of the review date (2026-05-24), AWS provider 5.x is current and the documented resources/arguments remain stable.
