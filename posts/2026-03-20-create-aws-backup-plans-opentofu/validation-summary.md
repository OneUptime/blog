# Validation Summary: How to Create AWS Backup Plans with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- AWS Backup (`aws_backup_plan`, `aws_backup_report_plan`)
- AWS Backup Vault references
- AWS Backup lifecycle policies (warm + cold storage)
- AWS cron expressions (Quartz-style 6-field syntax)
- Windows VSS application-consistent backups
- Cross-region copy actions

## Sources Consulted
- Terraform AWS provider — `aws_backup_plan`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_plan
- Terraform AWS provider — `aws_backup_report_plan`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_report_plan
- AWS Backup developer guide — Lifecycle / cold storage rules: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_Lifecycle.html
- AWS Backup developer guide — Schedule expressions / cron syntax: https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup-plan.html
- AWS Backup developer guide — Reports and report templates: https://docs.aws.amazon.com/aws-backup/latest/devguide/working-with-reports.html
- Amazon CloudWatch Events / EventBridge cron expressions (used by AWS Backup): https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cron-expressions.html

## Issues Found
- **Daily rule cold-storage lifecycle was invalid.** The `daily-backup` rule (and its `copy_action`) used `cold_storage_after = 14` with `delete_after = 30`. AWS Backup requires backups to remain in cold storage for a minimum of 90 days, i.e. `delete_after - cold_storage_after >= 90`. With only a 16-day window, AWS Backup would reject the plan at apply time with a `InvalidParameterValueException`. Fixed by removing the `cold_storage_after` line from both the rule lifecycle and the `copy_action` lifecycle, and updating the rule comment from "30-day retention with cold storage transition" to "30-day retention (warm storage only)". The weekly (335-day window) and monthly (2525-day window) rules already satisfy the 90-day minimum and were left unchanged.

## Review Notes
- Cron expressions all use the AWS 6-field Quartz-style syntax correctly: hourly `cron(0 * * * ? *)`, daily `cron(0 3 * * ? *)`, weekly Saturday `cron(0 2 ? * 7 *)` (where 1=SUN, 7=SAT), and monthly `cron(0 1 1 * ? *)`.
- `start_window` and `completion_window` are in minutes, which matches the example values (60 and 180).
- `advanced_backup_setting` with `WindowsVSS = "enabled"` and `resource_type = "EC2"` is the correct shape; `WindowsVSS` is the only currently supported option key.
- `aws_backup_report_plan` with `report_template = "BACKUP_JOB_REPORT"` correctly supports both `CSV` and `JSON` formats. (Compliance templates `CONTROL_COMPLIANCE_REPORT` and `RESOURCE_COMPLIANCE_REPORT` only support `CSV`, but those are not used here.)
- Cold storage is only supported for certain resource types (EFS, certain EBS volumes via Backup, S3, etc.); RDS and FSx do not support cold storage transition. Readers using these tiered rules across mixed resource types may want to use selection-level filtering, but this is out of scope for the post.
- The post references `aws_backup_vault.hot`, `aws_backup_vault.main`, `aws_backup_vault.compliance`, `aws_backup_vault.dev`, `aws_s3_bucket.backup_reports`, and `var.dr_vault_arn` without defining them. This is acceptable for a focused tutorial on backup plans, but readers will need to define these resources/variables themselves.
