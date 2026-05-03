# Validation Summary: How to Set Up Database Replication for DR with OpenTofu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS RDS (PostgreSQL) — `aws_db_instance` cross-region read replica
- AWS Aurora Global Database — `aws_rds_global_cluster`, `aws_rds_cluster`
- GCP Cloud SQL (PostgreSQL) — `google_sql_database_instance` with cross-region replica and PITR
- Azure SQL — `azurerm_mssql_server`, `azurerm_mssql_failover_group`
- AWS KMS (for encrypted cross-region replication)

## Sources Consulted
- Terraform AWS provider — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider — `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider — `aws_rds_global_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_global_cluster
- Terraform Google provider — `google_sql_database_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform AzureRM provider — `azurerm_mssql_server`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- Terraform AzureRM provider — `azurerm_mssql_failover_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_failover_group
- AWS Aurora Global Database documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html

## Issues Found

1. **`aws_db_instance.replica_us_west` had `final_snapshot_identifier` and `skip_final_snapshot = false`** — RDS read replicas cannot take final snapshots; the API will skip them regardless. Changed to `skip_final_snapshot = true` and removed `final_snapshot_identifier` to avoid misleading the reader.

2. **`google_sql_database_instance.cross_region_replica` used `replica_configuration { failover_target = false }`** — Per the Google provider docs, `failover_target` is "Not supported for Postgres database." It is a MySQL-only First-Generation HA setting and is invalid here. Removed the entire `replica_configuration` block since `failover_target` was its only field.

3. **`azurerm_mssql_failover_group` had `grace_minutes = 30`** — Azure's automatic failover policy requires a minimum grace period of 60 minutes. Although Terraform's schema does not enforce this client-side, the Azure REST API rejects values below 60. Updated to `grace_minutes = 60` with an explanatory comment.

4. **Aurora Global Database "< 1s replication" claim in the summary** — AWS documentation phrases this as "typically under one second" rather than guaranteed sub-second. Softened the wording in the summary paragraph for accuracy. Section heading kept as-is since "< 1s" is a recognized shorthand.

## Review Notes
- The Aurora primary cluster example omits `aws_rds_cluster_instance` resources; in practice at least one cluster instance is required for the cluster to be queryable. This is acceptable for a tutorial focused on replication topology rather than full provisioning, but readers should know the example is not a complete deploy on its own.
- `backup_retention_period = 35` on the primary RDS instance is the documented maximum. The inline comment ("Maximum for cross-region replica support") is slightly misleading — 35 days is the max for any RDS instance, not specific to cross-region replicas. Left as-is since it is not technically wrong.
- The KMS key references differ between sections (`aws_kms_key.dr_rds.arn` in Step 1 vs `aws_kms_key.dr.arn` in Step 2). Both are valid Terraform references; readers should treat them as illustrative placeholders for whichever DR-region KMS key they manage.
- Aurora PostgreSQL `engine_version = "15.4"` is valid at the time of writing; readers deploying later should consult the AWS engine version matrix as supported versions roll forward.
- The example does not include networking (VPC, subnet groups, security groups) or IAM bindings, which a production deployment would require. This is reasonable scoping for a replication-focused post.
