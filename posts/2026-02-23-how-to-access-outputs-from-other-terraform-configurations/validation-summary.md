# Validation Summary: How to Access Outputs from Other Terraform Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform remote state and `terraform_remote_state`
- Terraform S3, AzureRM, GCS, local, and remote backends
- HCP Terraform / Terraform Enterprise `tfe_outputs`
- AWS provider data sources and resources
- AWS IAM policy examples

## Sources Consulted
- HashiCorp Terraform documentation: `terraform_remote_state` data source - https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Terraform documentation: S3 backend - https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform documentation: AzureRM backend - https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp Terraform documentation: GCS backend - https://developer.hashicorp.com/terraform/language/backend/gcs
- HashiCorp Terraform documentation: local backend - https://developer.hashicorp.com/terraform/language/settings/backends/local
- HashiCorp Terraform documentation: remote backend - https://developer.hashicorp.com/terraform/language/backend/remote
- Terraform Registry: HashiCorp TFE provider `tfe_outputs` data source - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/data-sources/outputs
- Terraform Registry: HashiCorp AWS provider `aws_subnets` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Terraform's S3 backend documentation marks DynamoDB-based locking as deprecated, so the example was updated to use `use_lockfile = true`.
- The `tfe_outputs` example used `data.tfe_outputs.network.values.public_subnet_ids[0]`. The TFE provider documentation notes that `values` is marked sensitive and recommends `nonsensitive_values` for known non-sensitive outputs, so the subnet example was updated accordingly.
- The missing-output section implied the shown `try()` pattern could handle a source configuration that had not been applied. `try()` can help with optional or renamed output attributes, but it cannot recover from a failed remote state read. The wording was corrected.

## Review Notes
Terraform was not installed in the local environment, so snippets were reviewed against official documentation rather than validated with `terraform validate`. The remaining snippets are illustrative and in several places intentionally omit required surrounding provider/resource arguments with `# ...`.
