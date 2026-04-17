# Validation Summary: How to Use Workspaces with Remote Backends in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (workspaces, remote backends)
- AWS S3 backend (with optional DynamoDB locking)
- Google Cloud Storage (GCS) backend
- Azure Blob Storage (azurerm) backend
- PostgreSQL (pg) backend
- GitHub Actions (CI/CD example)
- HCL configuration language

## Sources Consulted
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu GCS backend docs: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu azurerm backend docs: https://opentofu.org/docs/language/settings/backends/azurerm/
- OpenTofu pg backend docs: https://opentofu.org/docs/language/settings/backends/pg/
- Terraform GCS backend docs: https://developer.hashicorp.com/terraform/language/backend/gcs
- OpenTofu source for azurerm backend state path: https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/azure/backend_state.go

## Issues Found

1. **Azure (azurerm) backend workspace state path was incorrect.** The post showed non-default workspace paths as `env:/<workspace>/app/terraform.tfstate`. The actual implementation in OpenTofu concatenates `env:<workspace_name>` directly onto the configured `key` (e.g., `app/terraform.tfstateenv:production`). Updated the diagram and added a one-line clarification.

2. **PostgreSQL (pg) backend used invalid configuration option and table name.** The post used `schema_prefix = "app"` and referenced an `app_states` table. The pg backend has no `schema_prefix` option — the correct option is `schema_name` (default: `terraform_remote_state`), and workspace rows live in a single `states` table within that schema (keyed by workspace name). Replaced the config snippet and the SQL example accordingly.

## Review Notes

- The S3 example uses `dynamodb_table` for state locking, which is still fully supported by OpenTofu (the S3 backend docs explicitly state there are no plans to deprecate it). Newer setups may prefer S3-native locking via `use_lockfile = true`, but the existing example remains valid.
- The default value for `workspace_key_prefix` in the S3 backend is correctly noted as `env:`.
- GCS workspace file naming (`<prefix>/<name>.tfstate`, with the default workspace at `<prefix>/default.tfstate`) is accurate.
- The `TF_WORKSPACE` environment variable usage and `terraform_remote_state` cross-workspace references are correct.
- The GitHub Actions example uses current actions (`actions/checkout@v4`, `aws-actions/configure-aws-credentials@v4`, `opentofu/setup-opentofu@v1`) and valid syntax.
