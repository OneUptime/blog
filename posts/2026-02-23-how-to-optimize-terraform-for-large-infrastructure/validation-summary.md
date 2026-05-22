# Validation Summary: How to Optimize Terraform for Large Infrastructure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state and remote state
- Terraform S3 backend
- Terraform provider plugin cache
- AWS S3
- AWS DynamoDB
- HCP Terraform

## Sources Consulted
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI configuration and provider plugin cache: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform S3 backend reference: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform remote state data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform dependency graph internals: https://developer.hashicorp.com/terraform/internals/graph
- Terraform state command reference: https://developer.hashicorp.com/terraform/cli/commands/state

## Issues Found
- The post recommended enabling DynamoDB locking for the S3 backend. HashiCorp now documents S3 lockfiles with `use_lockfile = true` as the current locking mechanism and marks DynamoDB-based locking as deprecated, so the backend example and surrounding text were updated.
- The post described `-target` as a quick-change workflow and said it skips refreshing and planning everything else. Terraform documentation frames resource targeting as an exceptional option and focuses planning on selected resources and dependencies, so the wording was tightened.
- The post said every `terraform init` downloads provider plugins by default. Terraform stores plugins per working directory by default and may reuse local copies, but separate projects can download separate copies; the wording was corrected.
- The post said every data source triggers an API call. Some built-in or non-provider data sources do not behave that way, so the claim was narrowed to provider data sources that query remote APIs.
- The post described Terraform trace logging as a built-in way to get timing information. Trace logs can help identify slow steps, but they are not a dedicated timing profiler, so the wording was corrected.

## Review Notes
The remaining examples and commands are technically valid for current Terraform usage. Terraform was not installed in the local environment, so CLI options were verified against official HashiCorp documentation rather than local `terraform -help` output.
