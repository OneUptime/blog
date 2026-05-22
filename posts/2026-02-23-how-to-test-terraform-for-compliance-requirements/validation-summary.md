# Validation Summary: How to Test Terraform for Compliance Requirements

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform test framework
- Terraform CLI
- Terraform AWS Provider
- Terratest
- Go
- GitHub Actions
- Bash

## Sources Consulted
- Terraform test framework documentation: https://developer.hashicorp.com/terraform/language/tests
- Terraform test command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Terratest Terraform package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Terraform AWS Provider `aws_s3_bucket_server_side_encryption_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS Provider `aws_s3_bucket_public_access_block` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- Terraform AWS Provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_ebs_volume` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume

## Issues Found
- The native Terraform test examples used `plan.resource_changes` inside `.tftest.hcl` assertions. The Terraform test framework documentation supports assertions against named values, resources, variables, outputs, and run outputs, but does not expose the plan JSON `resource_changes` collection directly in `.tftest.hcl`. I changed those assertions to reference Terraform-managed resources directly.
- The S3 bucket encryption example checked `server_side_encryption_configuration` on `aws_s3_bucket`. Current AWS provider usage manages bucket default encryption with `aws_s3_bucket_server_side_encryption_configuration`, so I updated the assertion to check that resource instead.
- The original `alltrue([... : true if ...])` patterns would not fail for non-compliant resources because failing items were filtered out of the list. I replaced them with boolean expressions over the resources being checked.

## Review Notes
The Terratest example is consistent with Terratest's `InitAndPlanAndShow` behavior and Terraform's JSON plan format. The CI command `terraform test -filter="tests/compliance/" -verbose` matches the documented `terraform test` options. Terraform was not installed in the local environment, so CLI behavior was verified against official documentation rather than local `terraform --help` output.
