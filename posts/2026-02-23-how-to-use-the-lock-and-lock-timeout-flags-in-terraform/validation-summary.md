# Validation Summary: How to Use the -lock and -lock-timeout Flags in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state locking
- Terraform S3 backend
- Terraform GCS backend
- Terraform azurerm backend
- GitHub Actions
- GitLab CI

## Sources Consulted
- Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform `force-unlock` command reference: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform `state list` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/list
- Terraform `state show` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/show
- Terraform `state pull` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform `output` command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform azurerm backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform HTTP backend documentation: https://developer.hashicorp.com/terraform/language/backend/http

## Issues Found
- The post originally said Terraform locks state for every operation that reads or modifies state. Updated this to match the official state locking behavior: Terraform locks state for operations that could write state, when the backend supports locking.
- The post showed `terraform state list -lock=false`, `terraform state show ... -lock=false`, `terraform output -lock=false`, and `terraform state pull -lock=false`. These commands do not support the `-lock` flag in current Terraform CLI documentation, so the examples were replaced with valid state inspection commands.
- The S3 backend example used `dynamodb_table` as the main locking configuration and described DynamoDB TTL cleanup. Current Terraform documentation marks DynamoDB-based S3 locking as deprecated and recommends `use_lockfile = true` for S3 lockfile locking, so the example and explanation were updated.
- The GCS and Azure backend descriptions included implementation details not stated in the official backend docs. These were revised to the documented guarantees that the backends support state locking, and that Azure uses Blob Storage native capabilities for locking and consistency checking.
- The best-practices list recommended `-lock=false` for read-only commands such as `state list`, `output`, and `state pull`. This was corrected because those commands do not accept the flag.

## Review Notes
Terraform was not installed in the local workspace, so command behavior was verified against official HashiCorp documentation rather than local `terraform -help` output. The CI examples are syntactically plausible, but real pipelines should also include normal production safeguards such as non-interactive approval handling and backend credentials.
