# Validation Summary: How to Test Terraform Outputs and Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform native test framework
- Terraform output values
- Terraform data sources
- Terraform provider mocking
- AWS Terraform provider
- Terratest
- Go testing

## Sources Consulted
- HashiCorp Terraform test framework documentation: https://developer.hashicorp.com/terraform/language/tests
- HashiCorp Terraform provider mocking documentation: https://developer.hashicorp.com/terraform/language/tests/mocking
- HashiCorp Terraform `terraform test` command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- HashiCorp Terraform output command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider `aws_ami_ids` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami_ids
- Terratest Terraform package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform

## Issues Found
- The data source fallback example used `try(data.aws_ami.app.id, var.fallback_ami_id)` to handle a missing AMI. The `aws_ami` data source fails when it cannot resolve a single matching AMI, and `try()` cannot recover from that provider read failure. I changed the example to use `aws_ami_ids`, which returns a list of matching AMI IDs, then selects the first ID or falls back when the list is empty.
- The Terratest sensitive output section said to use a specific function for sensitive outputs, but Terratest does not expose a separate sensitive-output helper. I changed the text to explain that `terraform.Output` can retrieve the value by name, matching Terraform CLI behavior for named sensitive outputs.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp command documentation rather than local `terraform --help` output.
- The examples create real AWS infrastructure unless provider mocking or `command = plan` is used, so test accounts and cleanup remain important for real use.
