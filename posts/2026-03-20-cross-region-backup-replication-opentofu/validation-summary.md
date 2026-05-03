# Validation Summary: How to Configure Cross-Region Backup Replication with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Terraform AWS provider (`aws_backup_vault`, `aws_backup_plan`, `aws_dlm_lifecycle_policy`, `aws_db_instance_automated_backups_replication`, `aws_s3_bucket`, `aws_s3_bucket_replication_configuration`)
- AWS Backup (cross-region copy, vaults, plans, lifecycle)
- AWS Data Lifecycle Manager (DLM) for EBS snapshots
- Amazon RDS automated backup cross-region replication
- Amazon S3 Cross-Region Replication (CRR) with KMS-encrypted objects
- AWS KMS (per-region keys)

## Sources Consulted
- AWS Backup `Lifecycle` API reference: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_Lifecycle.html
- AWS DLM `CrossRegionCopyRule` API reference: https://docs.aws.amazon.com/dlm/latest/APIReference/API_CrossRegionCopyRule.html
- Terraform AWS provider docs for `aws_backup_plan`, `aws_dlm_lifecycle_policy`, `aws_db_instance_automated_backups_replication`, and `aws_s3_bucket_replication_configuration`

## Issues Found
1. **AWS Backup lifecycle constraint violated** — In the `aws_backup_plan` example, both the rule's `lifecycle` and the `copy_action`'s `lifecycle` used `cold_storage_after = 30` with `delete_after = 90`. Per the AWS Backup `Lifecycle` API, `DeleteAfterDays` must be at least 90 days greater than `MoveToColdStorageAfterDays`, because backups transitioned to cold storage have a 90-day minimum retention. With `cold_storage_after = 30`, `delete_after` must be ≥ 120. Updated `delete_after` from `90` to `120` in both lifecycle blocks so the example is valid at apply time.

2. **DLM `deprecate_rule` invalid for snapshot policy** — The DLM example sets `resource_types = ["VOLUME"]` (a snapshot lifecycle policy) but included a `deprecate_rule` block inside the first `cross_region_copy_rule`. Per the AWS DLM `CrossRegionCopyRule` API documentation, `DeprecateRule` is "[Custom AMI policies only]" and cannot be used with snapshot policies — it would be rejected by the AWS API at apply. Removed the `deprecate_rule` block (and its preceding comment).

## Review Notes
- The `aws_s3_bucket_replication_configuration` example does not show that S3 versioning must be enabled on both source and destination buckets and that the replication IAM role (`aws_iam_role.replication`) must have appropriate permissions. These are real prerequisites for replication to function but the snippet is intentionally focused on the replication configuration itself; this is acceptable scope for the post.
- The example references `data.aws_caller_identity.current.account_id` and `aws_iam_role.dlm.arn` / `aws_iam_role.replication.arn` / `aws_kms_key.backup_*` without showing their definitions. This is fine for illustrative snippets in a tutorial.
- For `aws_db_instance_automated_backups_replication`, the resource is correctly created with the destination-region provider (`aws.dr`), which is required because the resource must be created in the destination region. `retention_period = 14` is within the allowed range (1–35 days).
- Per-region KMS keys are correctly emphasized in the conclusion — KMS keys are regional resources, so using separate keys per region is required.
