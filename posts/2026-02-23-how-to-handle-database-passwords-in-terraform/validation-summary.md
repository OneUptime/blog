# Validation Summary: How to Handle Database Passwords in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- HashiCorp `random` provider (`random_password`)
- AWS provider — `aws_db_instance` (RDS), `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, `aws_secretsmanager_secret_rotation`, `aws_ecs_task_definition`
- AWS CLI (`aws secretsmanager`, `aws rds modify-db-instance`)
- AzureRM provider — `azurerm_mssql_server`, `azurerm_key_vault_secret`
- Google provider — `google_sql_database_instance`, `google_sql_user`, `google_secret_manager_secret`, `google_secret_manager_secret_version`
- Kubernetes provider — `kubernetes_secret`
- PostgreSQL, MySQL, SQL Server, Cloud SQL password constraints

## Sources Consulted
- Terraform AWS provider docs — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS RDS User Guide — Password management with Secrets Manager: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- Terraform Google provider docs — `google_secret_manager_secret`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret
- Terraform random provider docs — `random_password`: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- Terraform AzureRM provider docs — `azurerm_mssql_server`
- AWS RDS master user password constraints (engine-specific reserved characters)

## Issues Found
- **Pattern 4 (Automatic Rotation with Secrets Manager)** — The original snippet set both `password = random_password.database.result` and `manage_master_user_password = true` on the same `aws_db_instance`. These arguments are mutually exclusive (the AWS provider rejects this with a `ConflictsWith` error: "Cannot be set if `manage_master_user_password` is set to `true`"). Removed the `password` argument and the now-unnecessary `lifecycle { ignore_changes = [password] }` block, and added an inline note clarifying the exclusivity. Also added a brief comment that the default rotation period when using `manage_master_user_password` is 7 days (per the AWS RDS user guide).

## Review Notes
- The `aws_db_instance.main.master_user_secret[0].secret_arn` attribute path is correct — `master_user_secret` is a computed list block, so `[0]` indexing is required.
- `random_password.numeric` is the current (non-deprecated) argument name; `number` is deprecated. The post already uses `numeric`-compatible defaults.
- The `google_secret_manager_secret` snippet uses the current `replication { auto {} }` block syntax (the older `replication { automatic = true }` form is superseded).
- The MySQL password reserved-character claim (`/`, `@`, `"`, space) matches AWS RDS documentation. The `override_special` strings throughout exclude these characters for the relevant engines.
- The AWS RDS PostgreSQL/MySQL password length comment ("max 128 chars") is correct for PostgreSQL; MySQL on RDS is 8–41 characters for the master password, but the post does not make a misstatement about MySQL length, so no edit was needed.
- Kubernetes `kubernetes_secret.data` values are automatically base64-encoded by the provider, and `tostring(...)` is required to coerce the numeric port — both used correctly.
- ECS `secrets[].valueFrom` ARN format with `:jsonKey::` suffix for individual JSON keys is correct.
- `engine_version = "15.4"` and `parameter_group_name = "default.postgres15"` for RDS PostgreSQL are valid as of the post's date; readers on much newer engines may need to bump these.
