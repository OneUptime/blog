# Validation Summary: How to Use Partial Backend Configuration in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu init` CLI)
- Terraform backend configuration (HCL)
- S3 backend (with DynamoDB state locking)
- GCS backend
- Azure azurerm backend
- GitHub Actions (CI/CD example)

## Sources Consulted
- OpenTofu Backend Configuration docs: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu `tofu init` command docs: https://opentofu.org/docs/cli/commands/init/
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu GCS backend docs: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu azurerm backend docs: https://opentofu.org/docs/language/settings/backends/azurerm/

## Issues Found
No technical issues found.

Verified items:
- Partial backend configuration is officially supported and documented.
- `-backend-config` accepts both file paths (`-backend-config=PATH`) and key/value pairs (`-backend-config="key=value"`), including mixing both forms.
- `-reconfigure` and `-migrate-state` are valid `tofu init` flags with the described behavior.
- The S3 backend block fields (`bucket`, `key`, `region`, `dynamodb_table`, `encrypt`) are correct.
- The GCS backend block fields (`bucket`, `prefix`) are correct.
- The azurerm backend block fields (`resource_group_name`, `storage_account_name`, `container_name`, `key`) are correct.
- The HCL `terraform { backend "..." {} }` block syntax is the correct form for declaring a backend; it cannot reference variables/locals, which justifies the partial-configuration pattern.
- GitHub Actions syntax `${{ vars.X }}` and `${{ secrets.Y }}` is valid.

## Review Notes
- OpenTofu 1.10+ added native S3 state locking via the `use_lockfile` option, which can replace `dynamodb_table`. The post still recommends `dynamodb_table`, which remains supported, but readers on newer versions may prefer native lockfiles. Not a correctness issue.
- The `terraform { ... }` configuration block is still the canonical form in OpenTofu for backend declarations and is correct as written.
