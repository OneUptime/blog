# Validation Summary: How to Handle Sensitive Variables in Terraform Securely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, `sensitive` variable/output flag)
- Terraform CLI (`terraform plan`, `terraform apply`, `terraform show`, `TF_VAR_` env vars)
- AWS Secrets Manager (`aws_secretsmanager_secret_version` data source and resource)
- AWS RDS (`aws_db_instance`)
- Azure Key Vault (`azurerm_key_vault_secret` data source)
- Azure PostgreSQL (`azurerm_postgresql_server`)
- Google Cloud Secret Manager (`google_secret_manager_secret_version`)
- Google Cloud SQL (`google_sql_user`)
- HashiCorp `random_password` resource
- Terraform Cloud / `tfe_variable` resource
- GitHub Actions
- pre-commit framework, gitleaks

## Sources Consulted
- Terraform variables / sensitive flag: https://developer.hashicorp.com/terraform/language/values/variables#suppressing-values-in-cli-output
- Terraform outputs / sensitive: https://developer.hashicorp.com/terraform/language/values/outputs#sensitive-suppressing-values-in-cli-output
- TF_VAR_ environment variables: https://developer.hashicorp.com/terraform/cli/config/environment-variables#tf_var_name
- AWS provider, `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider, `aws_secretsmanager_secret_version` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- AzureRM provider, `azurerm_key_vault_secret` data source: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret
- Google provider, `google_secret_manager_secret_version` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/secret_manager_secret_version
- `random_password` resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- `tfe_variable` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable
- gitleaks pre-commit hook: https://github.com/gitleaks/gitleaks
- pre-commit framework, local hooks: https://pre-commit.com/#repository-local-hooks
- actions/checkout: https://github.com/actions/checkout

## Issues Found

1. **Broken pre-commit bash pipe**: The `no-tfvars` hook used `git diff --cached --name-only | grep -q "\.tfvars$" | grep -v "example"`. `grep -q` suppresses output, so piping it into `grep -v` filters an empty stream — the second grep would never see the tfvars filenames, defeating the check. Replaced with `grep "\.tfvars$" | grep -qv "example"`, which actually filters out example filenames and exits non-zero only when there is a non-example `.tfvars` file in the diff.

2. **"This will fail" output example didn't actually fail**: The example claimed an output referencing `aws_db_instance.main.endpoint` and `.port` would fail because it exposed a sensitive value, but `endpoint` and `port` are not sensitive attributes in the AWS provider, so the output would have been accepted by Terraform without `sensitive = true`. Changed the "bad" example to reference `var.database_password` (which is sensitive), which is what actually triggers the "Output refers to sensitive values" error. Also added `password = var.database_password` to the "good" example so the `sensitive = true` is genuinely justified.

## Review Notes
- `azurerm_postgresql_server` is the legacy single-server resource and is deprecated by Microsoft in favor of `azurerm_postgresql_flexible_server` (the single-server SKU is being retired). The resource still works today, so this is not a correctness issue, but the example may want to migrate to the flexible-server resource in a future revision.
- The `TF_VAR_` environment-variable approach still leaves the value in shell history and process environment; the post acknowledges trade-offs in the conclusion.
- The `terraform plan -out=plan.tfplan -no-color 2>&1 | grep ...` snippet is illustrative; in practice, `terraform plan -out=...` writes the plan to the file and prints the human-readable summary to stdout, so the grep will filter most of that output away. It is presented as a "better" pattern rather than canonical, which is fine.
- Even with `sensitive = true`, the value is recoverable via `terraform output -json` (and is present in the state file). The post correctly notes the state-file caveat.
