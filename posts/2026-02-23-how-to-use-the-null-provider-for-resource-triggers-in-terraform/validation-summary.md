# Validation Summary: How to Use the Null Provider for Resource Triggers in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform null provider
- `null_resource`
- `terraform_data`
- Terraform provisioners
- AWS provider resources

## Sources Consulted
- HashiCorp Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp null provider `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- HashiCorp Terraform resource syntax documentation: https://developer.hashicorp.com/terraform/language/resources/syntax

## Issues Found
- The provider setup required Terraform `>= 1.5.0`, while the post states that `terraform_data` is available in Terraform 1.4 and later. Changed the constraint to `>= 1.4.0` so the example matches the documented version claim.
- The EC2 example used `ami-12345678` as a default AMI ID. That placeholder would not reliably apply in `us-east-1`, so the variable now requires the reader to provide a valid AMI ID for their selected region.
- The `terraform_data` storage example used `timestamp()` directly in `input`. Terraform documents that using `timestamp()` directly in resource attributes causes a diff on every run, so the example now uses a stable `build_timestamp` input variable.

## Review Notes
Terraform CLI was not installed in the review environment, so examples were reviewed against official documentation rather than validated with `terraform validate`. Provisioners remain a last-resort pattern, which the post correctly notes.
