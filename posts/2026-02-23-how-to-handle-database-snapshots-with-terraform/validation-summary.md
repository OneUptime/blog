# Validation Summary: How to Handle Database Snapshots with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS provider (`hashicorp/aws` ~> 5.0)
- Amazon RDS (`aws_db_instance`, `aws_db_snapshot`)
- Amazon Aurora (`aws_rds_cluster`, `aws_db_cluster_snapshot`)
- AWS Backup (`aws_backup_vault`, `aws_backup_plan`, `aws_backup_selection`)
- AWS KMS (`aws_kms_key`)
- AWS IAM (`aws_iam_role`, `aws_iam_role_policy_attachment`)
- Amazon DynamoDB (via AWS Backup)
- Amazon CloudWatch (`aws_cloudwatch_metric_alarm`)
- Amazon SNS (`aws_sns_topic`)

## Sources Consulted
- AWS Backup IAM service roles: https://docs.aws.amazon.com/aws-backup/latest/devguide/iam-service-roles.html
- AWSBackupServiceRolePolicyForBackup managed policy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSBackupServiceRolePolicyForBackup.html
- AWSBackupServiceRolePolicyForRestores managed policy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSBackupServiceRolePolicyForRestores.html
- AWS Backup CloudWatch metrics: https://docs.aws.amazon.com/aws-backup/latest/devguide/cloudwatch.html
- AWS Backup cron expressions: https://docs.aws.amazon.com/aws-backup/latest/devguide/cron-expressions.html
- Terraform AWS provider `aws_db_snapshot` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_snapshot
- Terraform AWS provider `aws_backup_plan`, `aws_backup_vault`, `aws_backup_selection` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_plan
- Terraform AWS provider `aws_rds_cluster` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- GitHub `shared_accounts` support for `aws_db_snapshot` (v4.58.0+): https://github.com/hashicorp/terraform-provider-aws/issues/3860

## Issues Found

1. **Incorrect IAM managed policy ARNs on the AWS Backup service role.** The post attached `arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForDynamoDB` (this managed policy does not exist — DynamoDB permissions are bundled into `AWSBackupServiceRolePolicyForBackup`) and `arn:aws:iam::aws:policy/AmazonRDSFullAccess` (an end-user RDS policy unsuitable for a backup service role and missing the cross-service backup actions for EBS, EFS, FSx, KMS grants, tagging, etc.).
   - **Fix:** Replaced both with the official AWS Backup service-role policies: `AWSBackupServiceRolePolicyForBackup` (for backup operations) and `AWSBackupServiceRolePolicyForRestores` (for restore operations). Renamed the second `aws_iam_role_policy_attachment` resource from `backup_rds_policy` to `restore_policy` to reflect its actual purpose.

2. **Outdated guidance about snapshot sharing requiring `null_resource`.** The post claimed Terraform cannot directly share RDS snapshots with other accounts and demonstrated a `null_resource` + `local-exec` workaround calling `aws rds modify-db-snapshot-attribute`. Since AWS provider v4.58.0 (and certainly with the post's pinned `~> 5.0`), `aws_db_snapshot` exposes a native `shared_accounts` argument.
   - **Fix:** Replaced the `null_resource` workaround and the misleading note with the supported `shared_accounts = ["123456789012"]` attribute on `aws_db_snapshot`.

## Review Notes

- The `aws_db_instance` and `aws_rds_cluster` configurations correctly use current attribute names (`backup_retention_period`, `backup_window`/`preferred_backup_window`, `copy_tags_to_snapshot`, `skip_final_snapshot`, `final_snapshot_identifier`, `storage_encrypted`).
- The PostgreSQL/Aurora-PostgreSQL `engine_version = "15.4"` values are valid, though specific minor versions get deprecated over time — readers should pick whatever minor version is current at the time of deployment.
- All three AWS Backup cron expressions (`cron(0 2 * * ? *)`, `cron(0 3 ? * SUN *)`, `cron(0 4 1 * ? *)`) follow the 6-field AWS format correctly (note that exactly one of day-of-month and day-of-week must be `?`).
- The CloudWatch metric `NumberOfBackupJobsFailed` in the `AWS/Backup` namespace is valid.
- The `aws_backup_plan` `rule` block correctly supports `lifecycle` and `copy_action` sub-blocks.
- The `aws_backup_selection` resource correctly supports both `resources` (explicit ARN list) and `selection_tag` (tag-based selection) in the same selection.
- `aws_db_subnet_group.main` and `aws_security_group.db_sg` are referenced but not defined in the post — acceptable for an example, but readers must supply these.
- The "Best Practices" advice to never set `skip_final_snapshot = true` on production databases is sound general guidance.
- Provider note: `aws_db_snapshot_copy` and `aws_db_cluster_snapshot` still lack a native `shared_accounts` attribute (tracked in hashicorp/terraform-provider-aws#31212 and #31359), so the `null_resource` workaround remains the option for those resources if a reader needs cluster-snapshot sharing.
