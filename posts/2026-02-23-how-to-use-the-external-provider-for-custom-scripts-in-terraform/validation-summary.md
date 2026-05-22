# Validation Summary: How to Use the External Provider for Custom Scripts in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp external provider
- HashiCorp AWS provider
- HCL
- Bash
- jq
- Python
- AWS Systems Manager Parameter Store
- HashiCorp Vault

## Sources Consulted
- HashiCorp external provider `external` data source documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- HashiCorp Terraform data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- HashiCorp AWS provider `aws_ssm_parameter` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- HashiCorp external provider source documentation mirror: https://raw.githubusercontent.com/hashicorp/terraform-provider-external/main/docs/data-sources/external.md
- HashiCorp AWS provider source documentation mirror: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ssm_parameter.html.markdown

## Issues Found
- The post stated that any stderr output from an external program is displayed as a warning. The official external provider protocol documents stderr as the channel for human-readable error messages when the program exits with a non-zero status. I updated the explanation to match the documented protocol.
- The best-practices section recommended using stderr for diagnostic messages and warnings and described scripts as being called multiple times during plan and apply. I clarified that stdout should be reserved for the JSON result, stderr should be used for non-zero error messages, and external programs should avoid observable side effects because Terraform re-runs them when state is refreshed and may read data sources during planning or defer them to apply.

## Review Notes
The HCL snippets use valid external data source and `aws_ssm_parameter` patterns for the provider versions shown. The shell examples correctly use `jq` to read string query values and emit a JSON object with string values. Terraform CLI is not installed in the local environment, so I could not run `terraform validate`; the review was performed against official provider and Terraform language documentation.
