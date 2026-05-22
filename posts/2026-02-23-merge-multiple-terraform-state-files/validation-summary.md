# Validation Summary: How to Merge Multiple Terraform State Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform S3 backend
- Terraform `terraform_remote_state` data source
- AWS S3 backend state locking

## Sources Consulted
- Terraform CLI state command reference: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform state move documentation: https://developer.hashicorp.com/terraform/cli/state/move
- Terraform state push command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform state pull command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform state CLI tutorial: https://developer.hashicorp.com/terraform/tutorials/state/state-cli
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state
- Linked OneUptime blog URLs were checked with HTTP HEAD requests and returned HTTP 200.

## Issues Found
- Several `terraform state mv` examples provided only a source address. `terraform state mv` requires both a source address and a destination address, even when the address is unchanged. Updated the examples and script to pass the same address as the destination where no rename is intended.
- The S3 backend example used `dynamodb_table` for state locking. Current Terraform documentation marks DynamoDB-based S3 backend locking as deprecated, so the example now uses `use_lockfile = true`.
- The scripting example created a hand-written empty state file with a blank lineage. Terraform documentation recommends using Terraform CLI state commands instead of directly editing state JSON, so that hand-written state initialization was removed.
- The Step 4 wording said `terraform init` creates an empty state. `terraform init` initializes the working directory and backend, but does not itself create a managed resource state snapshot. Reworded the step to avoid that claim.

## Review Notes
The article is technically relevant and remains valid after the corrections. The local environment did not have the Terraform CLI installed, so command behavior was checked against HashiCorp's current official documentation rather than local `terraform --help` output.
