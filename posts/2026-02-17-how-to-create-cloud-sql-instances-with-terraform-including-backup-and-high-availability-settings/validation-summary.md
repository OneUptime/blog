# Validation Summary: How to Create Cloud SQL Instances with Terraform Including Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Terraform
- HashiCorp Google provider
- HashiCorp Random provider
- Google Secret Manager
- Google Cloud private services access

## Sources Consulted
- Terraform Google provider `google_sql_database_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Google provider `google_sql_user` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_user
- Terraform Google provider `google_secret_manager_secret_version` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_version
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform Random provider `random_password` documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- Google Cloud SQL PostgreSQL backups overview: https://cloud.google.com/sql/docs/postgres/backup-recovery/backups
- Google Cloud SQL PostgreSQL restore and PITR overview: https://cloud.google.com/sql/docs/postgres/backup-recovery/restore
- Google Cloud SQL PostgreSQL high availability overview: https://cloud.google.com/sql/docs/postgres/high-availability
- Google Cloud SQL PostgreSQL private services access documentation: https://cloud.google.com/sql/docs/postgres/configure-private-services-access
- Google Cloud SQL PostgreSQL maintenance window documentation: https://cloud.google.com/sql/docs/postgres/set-maintenance-window

## Issues Found
1. The post used `replica_configuration.failover_target = false` in a PostgreSQL read-replica example. The Google provider documents `failover_target` as unsupported for PostgreSQL, so I removed the unnecessary `replica_configuration` block.
2. The post used only Terraform-level `deletion_protection`, which protects against Terraform deletes but not deletes through the Cloud SQL API, gcloud, or Console. I added `settings.deletion_protection_enabled = true` to the instance examples and clarified the best-practice language.
3. The password example used `random_password.result`, `google_sql_user.password`, and `google_secret_manager_secret_version.secret_data`, while the best-practice section said passwords should not be stored in Terraform state. Those arguments store sensitive values in state. I updated the example to use an ephemeral `random_password` and Google provider write-only arguments (`password_wo` and `secret_data_wo`) and added the Terraform 1.11/provider caveat.
4. The HA explanation said `availability_type = "REGIONAL"` was all it takes. The provider documentation also calls out enabled backups and PITR for PostgreSQL, so I clarified that HA requires the regional availability setting together with the backup/PITR settings shown in the example.

## Review Notes
Terraform CLI is not installed in this environment, so I could not run `terraform validate`. The HCL snippets were reviewed against current official Terraform provider and Google Cloud documentation instead.
