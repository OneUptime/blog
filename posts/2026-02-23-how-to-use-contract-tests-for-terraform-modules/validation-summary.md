# Validation Summary: How to Use Contract Tests for Terraform Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform native test framework
- Terraform CLI
- Terraform module inputs and outputs
- Terratest for Go
- GitHub Actions
- AWS networking resource ID conventions

## Sources Consulted
- Terraform Tests language documentation: https://developer.hashicorp.com/terraform/language/tests
- Terraform test command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform test files documentation: https://developer.hashicorp.com/terraform/language/files/tests
- Terratest Terraform package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Terratest quick start documentation: https://terratest.gruntwork.io/docs/getting-started/quick-start/
- HashiCorp setup-terraform GitHub Action: https://github.com/hashicorp/setup-terraform
- Referenced OneUptime article, "How to Test Terraform Outputs and Data": https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-outputs-and-data/view
- Referenced OneUptime article, "How to Measure Terraform Test Coverage": https://oneuptime.com/blog/post/2026-02-23-how-to-measure-terraform-test-coverage/view

## Issues Found
- The web application consumer contract test described a need for NAT gateway IPs for allowlisting, but the contract and assertion used `nat_gateway_ids`. Updated the comment and run name to describe NAT gateways for outbound traffic, matching the output being tested.
- The contract evolution example said `network_id` had already been removed in v2.0, then later showed a backward-compatibility test for deprecated outputs. Updated the changelog comment to mark `network_id` as deprecated instead of removed during the compatibility period.
- The backward-compatibility test claimed the old output name should still work, but asserted `output.vpc_id`. Updated the assertion and error message to check `output.network_id`.

## Review Notes
Terraform CLI was not installed in the local workspace, so examples were verified against official documentation rather than by executing `terraform test`. The post is accurate after the targeted fixes. Note that tests using `command = apply` and Terratest `InitAndApply` create real resources and require suitable provider credentials and cleanup controls in a real CI environment.
