# Validation Summary: How to Handle Workspace State Isolation in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform state and remote state
- Terraform S3 backend
- Terraform AzureRM backend
- HCP Terraform / Terraform Cloud workspaces
- AWS IAM policies
- AWS provider configuration

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform workspaces state documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform remote state data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform workspace select command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform named values documentation for `terraform.workspace`: https://developer.hashicorp.com/terraform/language/expressions/references
- HCP Terraform workspaces documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces
- Terraform `cloud` block documentation: https://developer.hashicorp.com/terraform/language/settings/terraform-cloud
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The first workspace command example was marked as `hcl` even though it contains shell commands. Changed the code fence to `bash`.
- The S3 backend example used `dynamodb_table` for state locking. Terraform's S3 backend now marks DynamoDB-based locking as deprecated, so the example was updated to use native S3 lock files with `use_lockfile = true`.
- The AzureRM backend section said workspace names are prepended to the key automatically. The official docs only specify that AzureRM stores state as blobs in the configured container and supports multiple named workspaces, so the wording was corrected to avoid an unsupported exact key-layout claim.
- The IAM example included DynamoDB locking permissions. Since the S3 backend example now uses native S3 lock files, the DynamoDB statement was removed and the S3 policy was adjusted to include lock-file access and a scoped `ListBucket` condition.
- The final state-locking recommendation named DynamoDB as the standard S3 locking approach. Updated it to native S3 lock files, with Azure blob leases retained for AzureRM.

## Review Notes
Terraform CLI was not installed in the local environment, so command behavior and configuration details were validated against current official documentation rather than local `terraform` execution.
