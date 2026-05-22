# Validation Summary: How to Use OpenTofu with Existing Terraform State

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenTofu CLI
- Terraform CLI
- Terraform/OpenTofu state files
- S3 backend state and DynamoDB locking
- Azure Blob Storage backend state
- Google Cloud Storage backend state
- HCP Terraform / Terraform Cloud state migration
- Terraform and OpenTofu workspaces

## Sources Consulted
- OpenTofu State documentation: https://opentofu.org/docs/language/state/
- OpenTofu Migration Guide: https://opentofu.org/docs/intro/migration/migration-guide/
- OpenTofu Terraform 1.9.x migration guide: https://opentofu.org/docs/v1.9/intro/migration/terraform-1.9/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu AzureRM backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- OpenTofu GCS backend documentation: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu cloud backend documentation: https://opentofu.org/docs/cli/cloud/
- OpenTofu plan command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu force-unlock command documentation: https://opentofu.org/docs/cli/commands/force-unlock/
- Terraform state push command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/push

## Issues Found
- The post said OpenTofu and Terraform use the same state file format without qualification. I changed this to "for compatible versions" and "supported Terraform versions" because OpenTofu documents backward compatibility for supported state snapshots, but migration from newer Terraform versions is version-specific.
- The version-mismatch section recommended using an older Terraform version to downgrade state by running `terraform apply`. I replaced this with version-aligned migration guidance, because older Terraform versions can refuse newer state and OpenTofu publishes version-specific migration paths such as migrating Terraform 1.9.x state with OpenTofu 1.9.0 first.
- The locking example used `tofu plan -lock=true`. I changed it to `tofu plan` and noted that state locking is enabled by default, matching the current OpenTofu plan command documentation, which documents disabling locking with `-lock=false`.

## Review Notes
The backend snippets for S3, AzureRM, and GCS use valid backend arguments. Existing S3 DynamoDB locking remains supported by OpenTofu, while OpenTofu also supports native S3 lock files with `use_lockfile` for teams that choose to migrate locking later.
