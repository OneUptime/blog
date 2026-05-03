# Validation Summary: How to Configure Database Backup Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS RDS (`aws_db_instance`)
- AWS RDS Cross-Region Automated Backups Replication (`aws_db_instance_automated_backups_replication`)
- AWS Aurora (`aws_rds_cluster`, aurora-postgresql)
- AWS Backup (`aws_backup_vault`, `aws_backup_plan`, `aws_backup_selection`)
- Azure SQL Database (`azurerm_mssql_database`) with short-term and long-term retention policies
- GCP Cloud SQL (`google_sql_database_instance`) with backup configuration / PITR

## Sources Consulted
- Terraform AWS provider docs: `aws_db_instance` — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- Terraform AWS provider docs: `aws_db_instance_automated_backups_replication` — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance_automated_backups_replication.html.markdown
- Terraform AWS provider docs: `aws_rds_cluster` — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_cluster.html.markdown
- Terraform AzureRM provider docs: `azurerm_mssql_database` — https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/mssql_database.html.markdown
- Terraform Google provider docs: `google_sql_database_instance` — https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/sql_database_instance.html.markdown
- AWS Backup cron schedule expression syntax (CloudWatch Events / EventBridge cron format)

## Issues Found

1. **Azure SQL retention policies were declared as standalone resources, which do not exist in the AzureRM provider.** The post used `azurerm_mssql_database_backup_short_term_retention_policy` and `azurerm_mssql_database_backup_long_term_retention_policy` as top-level resources. The AzureRM provider does not expose these as standalone resources — the schema only provides them as nested `short_term_retention_policy` and `long_term_retention_policy` blocks inside the `azurerm_mssql_database` resource. Fixed by inlining both policies as nested blocks within the existing `azurerm_mssql_database.app` resource and removing the (non-existent) standalone resource declarations. Field names (`retention_days`, `backup_interval_in_hours`, `weekly_retention`, `monthly_retention`, `yearly_retention`, `week_of_year`) were already correct and were preserved.

## Review Notes

- AWS RDS `backup_target` (values `region` / `outposts`) is correct; `region` is the default and the attribute forces resource replacement, so changing it on an existing instance will recreate it.
- `aws_db_instance_automated_backups_replication.pre_signed_url` is a valid Optional argument; setting it to `null` is equivalent to omitting it. The provider also exposes a `retention_period` argument (defaults to 7) that operators may want to set explicitly.
- The Aurora example correctly notes that `backtrack_window` is only valid for Aurora MySQL (not Aurora PostgreSQL); leaving it commented out under `aurora-postgresql` is appropriate.
- AWS Backup cron expressions use the CloudWatch Events 6-field cron syntax where exactly one of day-of-month / day-of-week must be `?`. Both schedules in the post (`cron(0 3 * * ? *)` and `cron(0 2 ? * SUN *)`) are valid.
- Azure SQL `yearly_retention` accepts ISO 8601 durations up to 10 years, so `P7Y` is within range. `weekly_retention` of `P1M` is also accepted (the schema permits any ISO 8601 form within the documented range).
- GCP `transaction_log_retention_days` is limited to 1–7 for standard PostgreSQL/MySQL editions (1–35 is only available for the Enterprise Plus tiers); the post's value of `7` is safe across all editions.
- The conclusion notes "sub-minute RPO" for Cloud SQL with PITR enabled — this is reasonable since transaction logs are continuously archived, but the actual minimum recovery granularity depends on engine and traffic.
